"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { sendPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    startTransition(async () => {
      const result = await sendPasswordReset(values);
      setSubmitting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSentTo(values.email);
    });
  }

  const disabled = isPending || submitting;

  if (sentTo) {
    return (
      <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-center">
        <h2 className="font-medium">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{sentTo}</strong>, we sent a link to reset your password.
          The link expires after one hour.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="text-sm text-muted-foreground underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={disabled}>
        {disabled ? "Sending link..." : "Send reset link"}
      </Button>
    </form>
  );
}
