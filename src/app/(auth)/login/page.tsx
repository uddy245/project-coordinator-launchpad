import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { redirectIfAuthed } from "@/lib/auth/require-user";

export const metadata = { title: "Log in — Launchpad" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  await redirectIfAuthed(redirect ?? "/dashboard");

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <span className="kicker">Sign in</span>
        <h1 className="display-title text-2xl sm:text-3xl">Welcome back.</h1>
        <p className="text-sm text-muted-foreground">
          Pick up where you left off in the programme.
        </p>
      </div>
      <hr className="section-rule" />
      <LoginForm redirectTo={redirect ?? "/dashboard"} />
      <p className="border-t border-rule pt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-ink underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
