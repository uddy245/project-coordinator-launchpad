import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { fulfilCheckoutSession } from "@/lib/stripe/fulfil";
import { Button } from "@/components/ui/button";
import { ActivationPoller } from "@/components/marketing/activation-poller";

export const metadata = { title: "Thanks! — Launchpad" };

type Props = { searchParams: Promise<{ session_id?: string | string[] }> };

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const user = await requireUser();
  const { session_id } = await searchParams;

  // Confirm the payment with Stripe now rather than only waiting for the
  // webhook. The poller below still covers the webhook-only path.
  const result = await fulfilCheckoutSession(
    typeof session_id === "string" ? session_id : undefined,
    user.id
  );

  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-3xl font-bold">Thanks for joining.</h1>
      {result === "not_paid" ? (
        <p className="text-muted-foreground">
          Your payment is still being processed by your bank. Your account unlocks automatically as
          soon as it clears, and you don&apos;t need to pay again.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            We&apos;re confirming your payment and activating your account now.
          </p>
          <ActivationPoller />
        </>
      )}
      <Button asChild variant="outline">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
