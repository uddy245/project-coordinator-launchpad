import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { redirectIfAuthed } from "@/lib/auth/require-user";

export const metadata = { title: "Sign up — Launchpad" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; ref?: string }>;
}) {
  const { redirect, ref } = await searchParams;
  await redirectIfAuthed(redirect ?? "/dashboard");
  // Sanitise ref so we don't write arbitrary user input to the DB.
  const sanitisedRef =
    ref && /^[a-z0-9_-]{1,80}$/i.test(ref) ? ref.toLowerCase() : null;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Apply · Enrol</span>
        <h1 className="display-title text-2xl sm:text-3xl">Create your account.</h1>
        <p className="text-sm text-muted-foreground">
          Begin Module 01 in minutes.
        </p>
      </div>
      <hr className="section-rule" />
      <SignupForm
        redirectTo={redirect ?? "/dashboard"}
        signupSource={sanitisedRef}
      />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
