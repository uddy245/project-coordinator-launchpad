"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/actions/checkout";
import { Button } from "@/components/ui/button";

export function PurchaseCTA() {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  // Set when a delayed payment is still clearing: the button is replaced by
  // a notice, so the learner cannot start a second checkout.
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  function onClick() {
    setSubmitting(true);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (!result.ok) {
        setSubmitting(false);
        if (result.code === "PAYMENT_PENDING") {
          setPendingNotice(result.error);
          return;
        }
        toast.error(result.error);
        return;
      }
      // Don't clear submitting — we're navigating away
      window.location.href = result.data.url;
    });
  }

  const disabled = isPending || submitting;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Unlock the Launchpad program</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        One-time payment of <strong>$749</strong>. Lifetime access to course materials — video
        lessons, AI-graded assignments, and a personalized portfolio (AI features subject to daily
        usage limits).
      </p>
      {pendingNotice ? (
        <p role="status" className="mt-4 rounded-md border bg-muted p-3 text-sm">
          {pendingNotice}
        </p>
      ) : (
        <Button onClick={onClick} disabled={disabled} size="lg" className="mt-4">
          {disabled ? "Redirecting to checkout..." : "Get access — $749"}
        </Button>
      )}
    </div>
  );
}
