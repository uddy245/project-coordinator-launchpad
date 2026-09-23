import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { redirectIfAuthed } from "@/lib/auth/require-user";
import { SignInCodeForm } from "@/components/auth/sign-in-code-form";

export const metadata = { title: "Enter your sign-in code — Launchpad" };

/**
 * Second step of "Email me a sign-in code" (replaces the magic link): enter
 * the code Neon Auth emailed. Works on any device — no link to click.
 */
export default async function SignInCodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>;
}) {
  const { email: emailParam, redirect: redirectParam } = await searchParams;
  const redirectTo =
    redirectParam?.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";
  await redirectIfAuthed(redirectTo);

  const email = z
    .string()
    .email()
    .safeParse(emailParam ?? "");
  if (!email.success) redirect("/login");

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Sign in</span>
        <h1 className="display-title text-2xl sm:text-3xl">Check your email.</h1>
        <p className="text-sm text-muted-foreground">
          If <strong>{email.data}</strong> has an account, we sent it a sign-in code. Enter it
          below.
        </p>
      </div>
      <hr className="section-rule" />
      <SignInCodeForm email={email.data} redirectTo={redirectTo} />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
