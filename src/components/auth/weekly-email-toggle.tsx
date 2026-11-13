"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setWeeklyDigestOptIn } from "@/actions/profile";

/** Profile setting: receive the weekly progress email or not. Saves on change. */
export function WeeklyEmailToggle({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [isPending, startTransition] = useTransition();

  function onChange(next: boolean) {
    // Ignore clicks while the previous change is saving. The checkbox is not
    // `disabled`, because disabling the focused control drops keyboard and
    // screen-reader focus to the page body; aria-disabled keeps it in place.
    if (isPending) return;
    setOptIn(next);
    startTransition(async () => {
      const result = await setWeeklyDigestOptIn({ optIn: next });
      if (!result.ok) {
        setOptIn(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Weekly email switched on." : "Weekly email switched off.");
    });
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Email</h2>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 aria-disabled:opacity-50"
          checked={optIn}
          aria-disabled={isPending}
          aria-busy={isPending}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className="font-medium">Send me the weekly progress email</span>
          <span className="block text-muted-foreground">
            A Sunday summary of your active days, streak and next lesson. Receipts and account
            emails are always sent.
          </span>
        </span>
      </label>
    </div>
  );
}
