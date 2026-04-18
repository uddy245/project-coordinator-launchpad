"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const SignUpSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().optional(),
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

export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodIssue(parsed.error), code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: parsed.data.fullName ? { data: { full_name: parsed.data.fullName } } : undefined,
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

  return { ok: true, data: undefined };
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

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
