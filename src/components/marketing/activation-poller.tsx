"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyAccess } from "@/actions/access";

const MAX_ATTEMPTS = 10;
const INTERVAL_MS = 1500;

type Status = "polling" | "activated" | "timeout";

const STATUS_TEXT: Record<Status, string> = {
  polling: "Activating your account…",
  activated: "Account activated — taking you to your dashboard…",
  timeout:
    "Activation is taking longer than expected. Please try again later: refresh your dashboard in a few minutes.",
};

export function ActivationPoller() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("polling");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      const { hasAccess } = await getMyAccess();
      if (cancelled) return;
      if (hasAccess) {
        setStatus("activated");
        router.refresh();
        setTimeout(() => {
          if (!cancelled) router.push("/dashboard");
        }, 1500);
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // One live region that stays mounted while its text changes, so screen
  // readers announce each status (WCAG 2.2 SC 4.1.3). Swapping in a new
  // element per status is often not announced.
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        status === "activated" ? "text-sm text-green-700" : "text-sm text-muted-foreground"
      }
    >
      {STATUS_TEXT[status]}
    </p>
  );
}
