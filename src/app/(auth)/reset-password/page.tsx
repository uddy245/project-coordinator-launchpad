import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set a new password — Launchpad" };

/**
 * Landing page for the password-recovery email link. The link goes through
 * /auth/callback first, which exchanges the recovery code for a session and
 * forwards here — so by the time this page renders, the user is signed in.
 * If there's no session (expired or reused link), bounce to /forgot-password
 * so they can request a fresh one.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Reset access</span>
        <h1 className="display-title text-2xl sm:text-3xl">Set a new password.</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <strong>{user.email}</strong>. Choose a new password to finish.
        </p>
      </div>
      <hr className="section-rule" />
      <ResetPasswordForm />
    </div>
  );
}
