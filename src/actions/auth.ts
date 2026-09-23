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
  // accounts by email). With "Verify at Sign-up" (code mode) Neon Auth emails
  // the code itself when it withholds the session — observed on a branch even
  // though project_config says sendVerificationEmailOnSignUp=false, so sending
  // here too would email two codes. Only if Neon issued a session for an
  // unverified user do we send the code ourselves.
  const verified = !!data?.user?.emailVerified;
  if (!verified && data && "token" in data && data.token) {
    await sendVerificationCode(parsed.data.email);
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
    // The SDK normalises Neon's 403 EMAIL_NOT_VERIFIED to code
    // "email_not_confirmed" / "Email verification required".
    if (
      msg.includes("email_not_confirmed") ||
      msg.includes("email_not_verified") ||
      msg.includes("not verified") ||
      msg.includes("verification required")
    ) {
      await sendVerificationCode(parsed.data.email);
      return {
        ok: false,
        error: "Please confirm your email — we've sent you a verification code.",
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

/** Email a sign-up verification code (Neon Auth email-OTP). Best effort. */
async function sendVerificationCode(email: string): Promise<{ error: AuthError }> {
  try {
    const { error } = await neonAuth().emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    return { error };
  } catch (err) {
    console.warn("[auth] sendVerificationOtp failed", err);
    return { error: { message: "Could not send the code." } };
  }
}

const EmailSchema = z
  .string()
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase().trim());

const VerifyCodeSchema = z.object({
  email: EmailSchema,
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,10}$/, "Enter the code from the email"),
});

export type VerifyEmailCodeInput = z.input<typeof VerifyCodeSchema>;

/**
 * Confirm an email with the code Neon Auth sent (Verify at Sign-up, code
 * mode). `signedIn` is true when Neon Auth also started a session; otherwise
 * the user logs in next. Identity linking (src/lib/auth/session.ts) only
 * happens once the email is verified.
 */
export async function verifyEmailCode(
  input: VerifyEmailCodeInput
): Promise<ActionResult<{ signedIn: boolean }>> {
  const parsed = VerifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const { data, error } = await neonAuth().emailOtp.verifyEmail({
    email: parsed.data.email,
    otp: parsed.data.code,
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("expired")) {
      return {
        ok: false,
        error: "That code has expired — send a new one.",
        code: "CODE_EXPIRED",
      };
    }
    if (msg.includes("attempt")) {
      return {
        ok: false,
        error: "Too many attempts — send a new code.",
        code: "RATE_LIMITED",
      };
    }
    if (msg.includes("otp") || msg.includes("code") || msg.includes("invalid")) {
      return {
        ok: false,
        error: "That code isn't right. Check the email and try again.",
        code: "INVALID_CODE",
      };
    }
    return { ok: false, error: error.message ?? "Could not verify the code.", code: "UNKNOWN" };
  }

  const signedIn = !!(data as { token?: string | null } | null)?.token;
  return { ok: true, data: { signedIn } };
}

/**
 * Re-send the verification code — to the signed-in (unverified) user, or to
 * the address from the sign-up flow. Never reveals whether it exists.
 */
export async function resendVerificationCode(email?: string): Promise<ActionResult> {
  const su = await getNeonSessionUser();
  const parsed = EmailSchema.safeParse(su?.email ?? email ?? "");
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address.", code: "INVALID_INPUT" };
  }
  const { error } = await sendVerificationCode(parsed.data);
  if (error && errorText(error).match(/rate limit|too many/)) {
    return {
      ok: false,
      error: "Too many requests — wait a minute and try again.",
      code: "RATE_LIMITED",
    };
  }
  return { ok: true, data: undefined };
}

const SignInCodeRequestSchema = z.object({ email: EmailSchema });

export type SignInCodeRequestInput = z.input<typeof SignInCodeRequestSchema>;

/**
 * "Email me a sign-in code": Neon Auth email-OTP (type "sign-in"). Replaces
 * the magic link, which cannot complete in this cross-domain setup (Neon
 * never issues the session-challenge cookie the app needs). Never reveals
 * whether the email has an account.
 */
export async function sendSignInCode(input: SignInCodeRequestInput): Promise<ActionResult> {
  const parsed = SignInCodeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }
  const { error } = await neonAuth().emailOtp.sendVerificationOtp({
    email: parsed.data.email,
    type: "sign-in",
  });
  if (error) {
    const msg = errorText(error);
    if (msg.includes("rate_limit") || msg.includes("too many")) {
      return {
        ok: false,
        error: "Too many requests — wait a minute and try again.",
        code: "RATE_LIMITED",
      };
    }
    return { ok: false, error: error.message ?? "Could not send the code.", code: "UNKNOWN" };
  }
  return { ok: true, data: undefined };
}

export type SignInWithCodeInput = z.input<typeof VerifyCodeSchema>;

/**
 * Complete email-code sign-in. Runs in this server action, so Neon's session
 * cookies are set on this response (same mechanism as the sign-up code).
 * A correct code proves the inbox, so the email is verified and identity
 * linking (src/lib/auth/session.ts) applies as usual.
 */
export async function signInWithCode(input: SignInWithCodeInput): Promise<ActionResult> {
  const parsed = VerifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const { error } = await neonAuth().signIn.emailOtp({
    email: parsed.data.email,
    otp: parsed.data.code,
  });

  if (error) {
    const msg = errorText(error);
    if (msg.includes("expired")) {
      return { ok: false, error: "That code has expired — send a new one.", code: "CODE_EXPIRED" };
    }
    if (msg.includes("attempt")) {
      return { ok: false, error: "Too many attempts — send a new code.", code: "RATE_LIMITED" };
    }
    if (msg.includes("otp") || msg.includes("code") || msg.includes("invalid")) {
      return {
        ok: false,
        error: "That code isn't right. Check the email and try again.",
        code: "INVALID_CODE",
      };
    }
    return { ok: false, error: error.message ?? "Could not sign in.", code: "UNKNOWN" };
  }

  return { ok: true, data: undefined };
}

export async function signOut(): Promise<never> {
  await neonAuth().signOut();
  redirect("/login");
}
