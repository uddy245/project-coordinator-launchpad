import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionState } from "@/lib/auth/session";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata = { title: "Verify your email — Launchpad" };

/**
 * Enter the verification code Neon Auth emailed at sign-up (or at sign-in
 * for an unconfirmed account). Accounts are linked to existing learner data
 * by email, so the app stays locked until the address is confirmed.
 *
 * The email comes from the (unverified) session if there is one, otherwise
 * from ?email= set by the sign-up / login forms.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const state = await getSessionState();
  if (state.status === "signed_in") redirect("/dashboard");

  const { email: emailParam } = await searchParams;
  const fromParam = z
    .string()
    .email()
    .safeParse(emailParam ?? "");
  const email =
    state.status === "unverified" ? state.email : fromParam.success ? fromParam.data : null;
  if (!email) redirect("/login");

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">One more step</span>
        <h1 className="display-title text-2xl sm:text-3xl">Confirm your email.</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification code to <strong>{email}</strong>. Enter it below to finish setting
          up your account.
        </p>
      </div>
      <hr className="section-rule" />
      <VerifyEmailForm email={email} />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        Wrong address?{" "}
        <Link
          href="/signup"
          className="font-medium text-ink underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
        >
          Start again
        </Link>
      </p>
    </div>
  );
}
