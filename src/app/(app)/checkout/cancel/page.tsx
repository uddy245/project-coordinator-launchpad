import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Checkout canceled — Launchpad" };

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <h1 className="text-3xl font-bold">Checkout canceled</h1>
      <p className="text-muted-foreground">
        No charge was made. You can try again whenever you&apos;re ready.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
