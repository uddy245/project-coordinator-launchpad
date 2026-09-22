import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { redirectIfAuthed } from "@/lib/auth/require-user";

export const metadata = { title: "Forgot password — Launchpad" };

export default async function ForgotPasswordPage() {
  await redirectIfAuthed("/dashboard");

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Reset access</span>
        <h1 className="display-title text-2xl sm:text-3xl">Forgot your password.</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send you a link to set a new one.
        </p>
        <p className="text-sm text-muted-foreground">
          Had an account before our September 2026 sign-in upgrade? This is also how you set your
          password for the new sign-in — once, and your progress stays with you.
        </p>
      </div>
      <hr className="section-rule" />
      <ForgotPasswordForm />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
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
