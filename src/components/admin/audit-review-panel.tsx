"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveAudit, overrideScores } from "@/actions/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DimensionSeed = { name: string; currentScore: number };

export function AuditReviewPanel({
  queueId,
  dimensions,
}: {
  queueId: string;
  dimensions: DimensionSeed[];
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(dimensions.map((d) => [d.name, d.currentScore]))
  );
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"approve" | "override">("approve");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      if (mode === "approve") {
        const result = await approveAudit(queueId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Approved.");
        router.push("/audit");
        router.refresh();
        return;
      }

      const overrides = dimensions
        .filter((d) => scores[d.name] !== d.currentScore)
        .map((d) => ({ dimension: d.name, score: scores[d.name]! }));

      if (overrides.length === 0) {
        toast.error("No scores changed. Switch to Approve or adjust at least one score.");
        return;
      }

      const result = await overrideScores({ queueId, note, overrides });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Overrides recorded.");
      router.push("/audit");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-semibold">Review</h2>

      <div className="mt-3 flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            checked={mode === "approve"}
            onChange={() => setMode("approve")}
          />
          Approve — accept AI scores
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            checked={mode === "override"}
            onChange={() => setMode("override")}
          />
          Override
        </label>
      </div>

      {mode === "override" && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            {dimensions.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-3">
                <Label htmlFor={`score-${d.name}`} className="flex-1 text-sm">
                  {d.name}
                  <span className="ml-2 text-xs text-muted-foreground">AI: {d.currentScore}</span>
                </Label>
                <Input
                  id={`score-${d.name}`}
                  type="number"
                  min={1}
                  max={5}
                  value={scores[d.name] ?? d.currentScore}
                  onChange={(e) =>
                    setScores((s) => ({
                      ...s,
                      [d.name]: Number(e.target.value),
                    }))
                  }
                  className="w-20"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Reviewer note (required, min 10 chars)</Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              minLength={10}
              className="w-full rounded-md border bg-background p-2 text-sm"
            />
          </div>
        </div>
      )}

      <Button type="button" onClick={submit} disabled={isPending} className="mt-5">
        {isPending ? "Saving…" : mode === "approve" ? "Approve" : "Submit overrides"}
      </Button>
    </div>
  );
}
