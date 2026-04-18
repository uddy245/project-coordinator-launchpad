import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Thanks! — Launchpad" };

export default async function CheckoutSuccessPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-3xl font-bold">Thanks for joining.</h1>
      <p className="text-muted-foreground">
        Your payment is confirmed. We&apos;re activating your account — this may take a few seconds.
        Head to the dashboard to get started.
      </p>
      <Button asChild size="lg">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
