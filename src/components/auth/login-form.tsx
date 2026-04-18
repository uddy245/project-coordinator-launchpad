"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signIn, sendMagicLink } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onPasswordSubmit(values: LoginValues) {
    setSubmitting(true);
    startTransition(async () => {
      const result = await signIn(values);
      setSubmitting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  function onMagicLink() {
    const email = getValues("email");
    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success) {
      toast.error("Enter a valid email address first.");
      return;
    }
    setSubmitting(true);
    startTransition(async () => {
      const result = await sendMagicLink({ email, redirectTo });
      setSubmitting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMagicLinkSentTo(email);
    });
  }

  const disabled = isPending || submitting;

  if (magicLinkSentTo) {
    return (
      <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-center">
        <h2 className="font-medium">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{magicLinkSentTo}</strong>. Click the link to finish
          logging in.
        </p>
        <button
          type="button"
          onClick={() => setMagicLinkSentTo(null)}
          className="text-sm text-muted-foreground underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={disabled}>
        {disabled ? "Logging in..." : "Log in"}
      </Button>
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onMagicLink}
        disabled={disabled}
      >
        Send me a magic link
      </Button>
    </form>
  );
}
