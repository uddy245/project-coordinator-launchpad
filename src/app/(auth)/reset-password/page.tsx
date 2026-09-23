import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set a new password — Launchpad" };

/**
 * Landing page for the password-reset email link. Neon Auth redirects here
 * with `?token=…` (or `?error=INVALID_TOKEN` for an expired/used link).
 * Without a usable token, bounce to /forgot-password so they can request a
 * fresh one.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token || error) {
    redirect("/forgot-password");
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Reset access</span>
        <h1 className="display-title text-2xl sm:text-3xl">Set a new password.</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new password to finish. You&apos;ll use it to log in from now on.
        </p>
      </div>
      <hr className="section-rule" />
      <ResetPasswordForm token={token} />
    </div>
  );
}
