import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { Button } from "@/components/ui/button";
import { ActivationPoller } from "@/components/marketing/activation-poller";

export const metadata = { title: "Thanks! — Launchpad" };

export default async function CheckoutSuccessPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-3xl font-bold">Thanks for joining.</h1>
      <p className="text-muted-foreground">
        Your payment is confirmed. We&apos;re activating your account now.
      </p>
      <ActivationPoller />
      <Button asChild variant="outline">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
