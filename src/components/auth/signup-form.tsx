"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SignupSchema = z.object({
  fullName: z.string().trim().optional(),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupValues = z.infer<typeof SignupSchema>;

export function SignupForm({
  redirectTo = "/dashboard",
  signupSource = null,
}: {
  redirectTo?: string;
  signupSource?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  function onSubmit(values: SignupValues) {
    setSubmitting(true);
    startTransition(async () => {
      const result = await signUp({ ...values, signupSource });
      setSubmitting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.needsEmailConfirmation) {
        setPendingConfirmationEmail(values.email);
        return;
      }
      toast.success("Account created — signing you in...");
      router.push(redirectTo);
      router.refresh();
    });
  }

  if (pendingConfirmationEmail) {
    return (
      <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-center">
        <h2 className="font-medium">Confirm your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{pendingConfirmationEmail}</strong>. Click the link
          to finish creating your account.
        </p>
        <button
          type="button"
          onClick={() => setPendingConfirmationEmail(null)}
          className="text-sm text-muted-foreground underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  const disabled = isPending || submitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" autoComplete="name" {...register("fullName")} />
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={disabled}>
        {disabled ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
