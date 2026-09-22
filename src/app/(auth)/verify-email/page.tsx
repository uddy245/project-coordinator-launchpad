import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth/session";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";

export const metadata = { title: "Verify your email — Launchpad" };

/**
 * Signed in with Neon Auth but the email isn't verified yet. Accounts are
 * linked to existing learner data by email, so the app stays locked until
 * the address is confirmed.
 */
export default async function VerifyEmailPage() {
  const state = await getSessionState();
  if (state.status === "signed_in") redirect("/dashboard");
  if (state.status === "signed_out") redirect("/login");

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">One more step</span>
        <h1 className="display-title text-2xl sm:text-3xl">Confirm your email.</h1>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{state.email}</strong>. Click it to finish setting
          up your account, then come back here.
        </p>
      </div>
      <hr className="section-rule" />
      <ResendVerificationButton />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        Wrong account?{" "}
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
