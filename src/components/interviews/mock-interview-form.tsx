"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitMockInterview } from "@/actions/mock-interview";
import { Button } from "@/components/ui/button";
import { VoiceRecorder } from "@/components/interviews/voice-recorder";

type Status = "graded_pending" | "grading" | "graded" | "grading_failed" | null;

export function MockInterviewForm({
  scenarioId,
  initialResponse,
  currentStatus,
  currentScore,
  currentPass,
  currentFeedback,
}: {
  scenarioId: string;
  initialResponse: string;
  currentStatus: Status;
  currentScore: number | null;
  currentPass: boolean | null;
  currentFeedback: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialResponse);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync `text` when the server-side initialResponse changes (router.refresh
  // after submit, navigating between scenarios, etc). React preserves
  // client-state across server-component re-renders, so without this the
  // textarea lags behind.
  const lastSyncedRef = useRef(initialResponse);
  useEffect(() => {
    if (initialResponse !== lastSyncedRef.current) {
      lastSyncedRef.current = initialResponse;
      setText(initialResponse);
    }
  }, [initialResponse]);

  // Show the grade whenever we have one. If the user has edited the text
  // since it was graded, we surface a small "edited since grading" hint
  // so they know the displayed grade is for the previously-submitted text.
  const isGraded = currentStatus === "graded" && currentScore !== null;
  const editedSinceGrading = isGraded && text.trim() !== initialResponse.trim();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await submitMockInterview({
      scenarioId,
      responseText: text.trim(),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const charCount = text.length;
  const minChars = 80;

  return (
    <div className="space-y-8">
      {isGraded ? (
        <div
          className={`border-l-4 px-5 py-4 ${
            currentPass
              ? "border-[hsl(var(--status-complete))] bg-paper"
              : "border-[hsl(var(--accent))] bg-paper"
          }`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="kicker">
              {editedSinceGrading ? "Previous grade" : "Latest grade"}
            </span>
            <span className="data-numeral text-2xl text-ink">
              {currentScore?.toFixed(1)} / 5
            </span>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                currentPass
                  ? "bg-[hsl(var(--status-complete))] text-white"
                  : "bg-[hsl(var(--accent))] text-white"
              }`}
            >
              {currentPass ? "Passed" : "Needs revision"}
            </span>
            {editedSinceGrading ? (
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                · Edited since grading
              </span>
            ) : null}
          </div>
          {currentFeedback ? (
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
              {currentFeedback}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <VoiceRecorder disabled={busy} />

        <div>
          <label htmlFor="response" className="kicker">
            Your response
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            Type as you would speak it. Aim for the quality of a real
            interview answer — specifics, judgment, action.
          </p>
          <textarea
            id="response"
            className="mt-3 flex min-h-[280px] w-full rounded-md border border-input bg-background px-4 py-3 text-base leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Walk me through how you'd handle this..."
            required
          />
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`font-mono text-[0.7rem] uppercase tracking-[0.14em] ${
                charCount >= minChars
                  ? "text-[hsl(var(--status-complete))]"
                  : "text-muted-foreground"
              }`}
            >
              {charCount} / {minChars}+ chars
            </span>
            {isGraded ? (
              <span className="kicker">
                Submitting will replace your previous grade
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.08] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || charCount < minChars}>
            {busy
              ? "Grading…"
              : isGraded
                ? editedSinceGrading
                  ? "Resubmit & regrade"
                  : "Regrade with no changes"
                : "Submit for grading"}
          </Button>
          <span className="kicker">Grading takes ~5 seconds</span>
        </div>
      </form>
    </div>
  );
}
