"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyAccess } from "@/actions/access";

const MAX_ATTEMPTS = 10;
const INTERVAL_MS = 1500;

export function ActivationPoller() {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "activated" | "timeout">("polling");

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

  if (status === "activated") {
    return (
      <p className="text-sm text-green-700">Account activated — taking you to your dashboard…</p>
    );
  }

  if (status === "timeout") {
    return (
      <p className="text-sm text-muted-foreground">
        Activation is taking longer than expected. Refresh your dashboard in a minute — if it&apos;s
        still not active, email support.
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">Activating your account…</p>;
}
