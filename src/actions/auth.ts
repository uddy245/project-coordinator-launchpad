"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { sendEmail } from "@/lib/email/send";
import { renderWelcome } from "@/lib/email/templates/welcome";

const SignUpSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().optional(),
  // Funnel attribution — populated by the signup page from the URL ?ref=
  // query param (e.g. "preview-coordinator-role"). Sanitised at the page
  // layer; we still constrain length here as a safety net.
  signupSource: z.string().trim().max(80).optional().nullable(),
});

const SignInSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Enter your password"),
});

export type SignUpInput = z.input<typeof SignUpSchema>;
export type SignInInput = z.input<typeof SignInSchema>;

function firstZodIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}

export type SignUpResult = { needsEmailConfirmation: boolean };

export async function signUp(input: SignUpInput): Promise<ActionResult<SignUpResult>> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const userMeta: Record<string, string> = {};
  if (parsed.data.fullName) userMeta.full_name = parsed.data.fullName;
  if (parsed.data.signupSource) userMeta.signup_source = parsed.data.signupSource;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: Object.keys(userMeta).length > 0 ? { data: userMeta } : undefined,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return { ok: false, error: "That email is already in use.", code: "EMAIL_IN_USE" };
    }
    if (msg.includes("password")) {
      return { ok: false, error: error.message, code: "WEAK_PASSWORD" };
    }
    return { ok: false, error: error.message, code: "UNKNOWN" };
  }

  // Supabase's anti-enumeration behaviour: signing up with an email that
  // already has a confirmed account "succeeds" but returns a user with no
  // identities and sends no email. Surface that honestly instead of showing
  // a "check your email" screen that will never arrive.
  const isRepeatedSignup =
    !data.session && data.user != null && (data.user.identities?.length ?? 0) === 0;
  if (isRepeatedSignup) {
    return {
      ok: false,
      error:
        "That email already has an account. Log in instead — or use “Forgot password?” if you don't know the password.",
      code: "EMAIL_IN_USE",
    };
  }

  // Welcome email — fire-and-forget. Silent so a Resend hiccup never breaks
  // signup itself; the welcome is a nice-to-have, not a blocker.
  const firstName = parsed.data.fullName?.split(/\s+/)[0]?.trim() || null;
  void sendEmail({
    to: { email: parsed.data.email, name: parsed.data.fullName ?? null },
    render: renderWelcome({ firstName }),
    silent: true,
    tag: "welcome",
  });

  // If Supabase has email confirmation enabled, no session is returned.
  // The form branches on this to show a "check your email" state instead
  // of trying to redirect into an authed area.
  return { ok: true, data: { needsEmailConfirmation: !data.session } };
}

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return {
        ok: false,
        error: "Please confirm your email — check your inbox for the confirmation link.",
        code: "EMAIL_NOT_CONFIRMED",
      };
    }
    if (msg.includes("invalid login credentials") || msg.includes("invalid")) {
      return {
        ok: false,
        error: "Incorrect email or password.",
        code: "INVALID_CREDENTIALS",
      };
    }
    return { ok: false, error: error.message, code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

const MagicLinkSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  redirectTo: z.string().optional(),
});

export type MagicLinkInput = z.input<typeof MagicLinkSchema>;

export async function sendMagicLink(input: MagicLinkInput): Promise<ActionResult> {
  const parsed = MagicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const target = parsed.data.redirectTo ?? "/dashboard";
  const emailRedirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${encodeURIComponent(target)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo },
  });

  if (error) {
    return { ok: false, error: error.message, code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

const PasswordResetRequestSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
});

export type PasswordResetRequestInput = z.input<typeof PasswordResetRequestSchema>;

/**
 * Send a password-recovery email. The link in the email lands on
 * /auth/callback (which exchanges the recovery code for a session) and
 * then forwards to /reset-password, where the user chooses a new password.
 *
 * Note: Supabase deliberately does NOT reveal whether the email has an
 * account (anti-enumeration), so the form always shows a neutral
 * "if an account exists, we sent a link" state on success.
 */
export async function sendPasswordReset(input: PasswordResetRequestInput): Promise<ActionResult> {
  const parsed = PasswordResetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect=${encodeURIComponent("/reset-password")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("security purposes")) {
      return {
        ok: false,
        error: "Too many requests — wait a minute and try again.",
        code: "RATE_LIMITED",
      };
    }
    return { ok: false, error: error.message, code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type UpdatePasswordInput = z.input<typeof UpdatePasswordSchema>;

/**
 * Set a new password for the currently signed-in user. Reached from
 * /reset-password after the recovery link has established a session.
 */
export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = UpdatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your reset link has expired. Request a new one from the login page.",
      code: "NOT_AUTHENTICATED",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("different from the old")) {
      return {
        ok: false,
        error: "New password must be different from your old one.",
        code: "SAME_PASSWORD",
      };
    }
    if (msg.includes("password")) {
      return { ok: false, error: error.message, code: "WEAK_PASSWORD" };
    }
    return { ok: false, error: error.message, code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
