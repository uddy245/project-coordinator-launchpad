"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestReview } from "@/actions/audit";
import { Button } from "@/components/ui/button";

type Props = {
  submissionId: string;
  /** If true, a decision already exists — hide the button entirely. */
  alreadyReviewed: boolean;
  /** If true, already in the audit queue (pending) — show disabled state. */
  alreadyQueued: boolean;
};

export function RequestReviewButton({ submissionId, alreadyReviewed, alreadyQueued }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (alreadyReviewed) return null;

  if (alreadyQueued) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        A human review has been requested and is pending. We&apos;ll update this page when it&apos;s
        done.
      </div>
    );
  }

  function submit() {
    startTransition(async () => {
      const result = await requestReview(submissionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Review requested. We'll notify you when it's reviewed.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">Think the AI got it wrong?</p>
          <p className="text-muted-foreground">Ask a human reviewer to take a second look.</p>
        </div>
        <Button onClick={submit} variant="outline" disabled={isPending}>
          {isPending ? "Requesting…" : "Request human review"}
        </Button>
      </div>
    </div>
  );
}
