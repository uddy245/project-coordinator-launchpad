"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/actions/checkout";
import { Button } from "@/components/ui/button";

export function PurchaseCTA() {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  function onClick() {
    setSubmitting(true);
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (!result.ok) {
        setSubmitting(false);
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
        One-time payment of <strong>$749</strong>. Lifetime access to video lessons, AI-graded
        assignments, and a personalized portfolio.
      </p>
      <Button onClick={onClick} disabled={disabled} size="lg" className="mt-4">
        {disabled ? "Redirecting to checkout..." : "Get access — $749"}
      </Button>
    </div>
  );
}
