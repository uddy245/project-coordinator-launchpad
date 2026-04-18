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
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to continue.</p>
      </div>
      <LoginForm redirectTo={redirect ?? "/dashboard"} />
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
