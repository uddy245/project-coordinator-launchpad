"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSubmissionStatus } from "@/actions/submission-status";

const POLL_MS = 3000;
const MAX_ATTEMPTS = 60; // 3 minutes ceiling

export function GradingInProgress({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"polling" | "timeout">("polling");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function tick() {
      if (cancelled) return;
      attempts += 1;
      const row = await getSubmissionStatus(submissionId);
      if (cancelled) return;
      if (row && row.status !== "pending" && row.status !== "grading") {
        router.refresh();
        return;
      }
      if (attempts >= MAX_ATTEMPTS) {
        setState("timeout");
        return;
      }
      setTimeout(tick, POLL_MS);
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [submissionId, router]);

  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <h2 className="text-lg font-semibold">Grading your submission…</h2>
      {state === "polling" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This usually takes under a minute. The page updates automatically.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Taking longer than expected. Refresh in a minute — if it&apos;s still not ready, email
          support.
        </p>
      )}
    </div>
  );
}
