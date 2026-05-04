"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateMoreScenarios } from "@/actions/interviews";

/**
 * Learner-facing "↻ Generate more scenarios" button on the /interviews
 * page. Calls Claude to add 3 fresh scenarios to the shared pool, then
 * refreshes the page so the new items appear in the list. Generation is
 * bounded by the existing daily Anthropic spend cap.
 */
export function GenerateMoreButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await generateMoreScenarios({ count: 3 });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const n = res.data.generated.length;
      toast.success(`${n} new scenario${n === 1 ? "" : "s"} generated. They're in the list below.`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground disabled:opacity-50"
      title="Generate 3 fresh practice scenarios via Claude. They join the shared pool."
    >
      {pending ? "Generating…" : "↻ Generate more scenarios"}
    </button>
  );
}
