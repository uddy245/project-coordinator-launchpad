"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { db } from "@/db";
import { usersInAuth } from "@/db/schema";
import { neonAuth } from "@/lib/auth/neon";
import { getNeonSessionUser, SIGNUP_SOURCE_COOKIE } from "@/lib/auth/session";
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

type AuthError = { message?: string; code?: string } | null | undefined;

function errorText(error: AuthError): string {
  return `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
}

/** Where email links (verification, reset) land back in the app. */
function appUrl(path: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`;
}

/** True if this email belongs to a user who signed up before the Neon migration. */
async function isLegacyUser(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: usersInAuth.id })
    .from(usersInAuth)
    .where(sql`lower(${usersInAuth.email}) = ${email}`)
    .limit(1);
  return !!row;
}

export type SignUpResult = { needsEmailConfirmation: boolean };

export async function signUp(input: SignUpInput): Promise<ActionResult<SignUpResult>> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  // Pre-migration learners already have an account and data. Send them
  // through the one-time password reset instead of creating a new login.
  if (await isLegacyUser(parsed.data.email)) {
    return {
      ok: false,
      error:
        "That email already has an account. We've upgraded sign-in — use “Forgot password?” to set a new password once.",
      code: "EMAIL_IN_USE",
    };
  }

  const { data, error } = await neonAuth().signUp.email({
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.fullName || parsed.data.email,
    callbackURL: appUrl("/dashboard"),
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("already exists") || msg.includes("user_already_exists")) {
      return {
        ok: false,
        error:
          "That email already has an account. Log in instead — or use “Forgot password?” if you don't know the password.",
        code: "EMAIL_IN_USE",
      };
    }
    if (msg.includes("password")) {
      return { ok: false, error: error.message ?? "Password rejected.", code: "WEAK_PASSWORD" };
    }
    return { ok: false, error: error.message ?? "Sign-up failed.", code: "UNKNOWN" };
  }

  // The profiles row is created on first verified request (see
  // provisionAppUser). Carry the attribution token until then.
  if (parsed.data.signupSource) {
    (await cookies()).set(SIGNUP_SOURCE_COOKIE, parsed.data.signupSource.toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
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

  // Email must be verified before the account is usable (the app links
  // accounts by email). If Neon Auth issued a session for an unverified
  // user, make sure a verification email goes out.
  const verified = !!data?.user?.emailVerified;
  if (!verified && data && "token" in data && data.token) {
    await neonAuth().sendVerificationEmail({
      email: parsed.data.email,
      callbackURL: appUrl("/dashboard"),
    });
  }

  return { ok: true, data: { needsEmailConfirmation: !verified } };
}

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const { error } = await neonAuth().signIn.email({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("not verified") || msg.includes("email_not_verified")) {
      return {
        ok: false,
        error: "Please confirm your email — check your inbox for the confirmation link.",
        code: "EMAIL_NOT_CONFIRMED",
      };
    }
    if (msg.includes("invalid") || msg.includes("credential") || msg.includes("password")) {
      return {
        ok: false,
        error:
          "Incorrect email or password. Had an account before our sign-in upgrade? Use “Forgot password?” to set a new one once.",
        code: "INVALID_CREDENTIALS",
      };
    }
    return { ok: false, error: error.message ?? "Sign-in failed.", code: "UNKNOWN" };
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

  const target = parsed.data.redirectTo?.startsWith("/") ? parsed.data.redirectTo : "/dashboard";

  const { error } = await neonAuth().signIn.magicLink({
    email: parsed.data.email,
    callbackURL: appUrl(target),
  });

  if (error) {
    return { ok: false, error: error.message ?? "Could not send link.", code: "UNKNOWN" };
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
 * Pre-migration learners have an `auth.users` row but no Neon Auth login.
 * Create one with an unguessable throwaway password so the reset email below
 * can be delivered; only the inbox owner can then set a real password.
 * Called with a plain fetch so no session cookie reaches this browser.
 */
async function ensureNeonAccountForLegacyUser(email: string): Promise<void> {
  if (!(await isLegacyUser(email))) return;
  try {
    await fetch(`${env.NEON_AUTH_BASE_URL.replace(/\/$/, "")}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: env.NEXT_PUBLIC_APP_URL },
      body: JSON.stringify({
        email,
        password: randomBytes(32).toString("base64url"),
        name: email,
      }),
    });
    // "User already exists" (already claimed) is the expected steady state.
  } catch (err) {
    console.warn("[auth] legacy account provisioning failed", err);
  }
}

/**
 * Send a password-reset email. The link returns to /reset-password?token=…
 * where the user chooses a new password.
 *
 * This is also the one-time path for learners who signed up before the move
 * to Neon Auth. The response never reveals whether the email has an account.
 */
export async function sendPasswordReset(input: PasswordResetRequestInput): Promise<ActionResult> {
  const parsed = PasswordResetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  await ensureNeonAccountForLegacyUser(parsed.data.email);

  const { error } = await neonAuth().requestPasswordReset({
    email: parsed.data.email,
    redirectTo: appUrl("/reset-password"),
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return {
        ok: false,
        error: "Too many requests — wait a minute and try again.",
        code: "RATE_LIMITED",
      };
    }
    return { ok: false, error: error.message ?? "Could not send reset email.", code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  token: z.string().min(1, "Your reset link is missing its token."),
});

export type UpdatePasswordInput = z.input<typeof UpdatePasswordSchema>;

/**
 * Set a new password using the token from the reset email
 * (/reset-password?token=…). The user then signs in with it.
 */
export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = UpdatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const { error } = await neonAuth().resetPassword({
    newPassword: parsed.data.password,
    token: parsed.data.token,
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("token")) {
      return {
        ok: false,
        error: "Your reset link has expired. Request a new one from the login page.",
        code: "NOT_AUTHENTICATED",
      };
    }
    if (msg.includes("password")) {
      return { ok: false, error: error.message ?? "Password rejected.", code: "WEAK_PASSWORD" };
    }
    return { ok: false, error: error.message ?? "Could not update password.", code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

/** Re-send the verification email for a signed-in but unverified user. */
export async function resendVerificationEmail(): Promise<ActionResult> {
  const su = await getNeonSessionUser();
  if (!su) {
    return { ok: false, error: "Sign in first.", code: "UNAUTHENTICATED" };
  }
  const { error } = await neonAuth().sendVerificationEmail({
    email: su.email,
    callbackURL: appUrl("/dashboard"),
  });
  if (error) {
    return { ok: false, error: error.message ?? "Could not send email.", code: "UNKNOWN" };
  }
  return { ok: true, data: undefined };
}

export async function signOut(): Promise<never> {
  await neonAuth().signOut();
  redirect("/login");
}
