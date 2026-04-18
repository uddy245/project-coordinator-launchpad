import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { redirectIfAuthed } from "@/lib/auth/require-user";

export const metadata = { title: "Sign up — Launchpad" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  await redirectIfAuthed(redirect ?? "/dashboard");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start your training in minutes.</p>
      </div>
      <SignupForm redirectTo={redirect ?? "/dashboard"} />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
