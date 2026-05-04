"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  startCapstoneAttempt,
  uploadCapstoneArtifact,
  submitCapstoneAttempt,
} from "@/actions/capstone";
import { Button } from "@/components/ui/button";

export type ArtifactSlot = {
  kind: string;
  label: string;
  uploadedFileName: string | null;
  uploadedAt: string | null;
};

export function CapstoneWorkspace({
  scenarioSlug,
  attemptId,
  attemptStatus,
  artifactSlots,
}: {
  scenarioSlug: string;
  attemptId: string | null;
  attemptStatus: "in_progress" | "submitted" | "graded" | "withdrawn" | null;
  artifactSlots: ArtifactSlot[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const allUploaded = artifactSlots.length > 0 && artifactSlots.every((s) => s.uploadedFileName);

  function onStart() {
    setError(null);
    startTransition(async () => {
      const result = await startCapstoneAttempt(scenarioSlug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onSubmit() {
    if (!attemptId) return;
    if (
      !confirm(
        "Submit your capstone for grading? You won't be able to change artifacts after this."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await submitCapstoneAttempt(attemptId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo("Submitted. Grading will start shortly.");
      router.refresh();
    });
  }

  if (!attemptId) {
    return (
      <div className="border border-rule bg-paper p-6">
        <p className="text-sm text-ink">
          When you&apos;re ready, start the capstone. You&apos;ll be able to upload each artifact
          independently and submit when all of them are in place — no time pressure.
        </p>
        {error ? <div className="mt-3 text-sm text-[hsl(var(--destructive))]">{error}</div> : null}
        <Button className="mt-4" onClick={onStart} disabled={pending}>
          {pending ? "Starting…" : "Begin capstone"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-paper px-5 py-4">
        <div>
          <span className="kicker">Attempt status</span>
          <div className="mt-1 font-mono text-sm text-ink">
            {attemptStatus === "in_progress"
              ? "In progress — keep going"
              : attemptStatus === "submitted"
                ? "Submitted — grading queued"
                : attemptStatus === "graded"
                  ? "Graded"
                  : "Withdrawn"}
          </div>
        </div>
        {attemptStatus === "in_progress" ? (
          <Button onClick={onSubmit} disabled={pending || !allUploaded}>
            {pending ? "Submitting…" : "Submit for grading"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.08] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="border border-rule bg-paper px-4 py-3 text-sm text-ink">{info}</div>
      ) : null}

      <ul className="space-y-3">
        {artifactSlots.map((slot) => (
          <ArtifactSlotRow
            key={slot.kind}
            slot={slot}
            attemptId={attemptId}
            disabled={attemptStatus !== "in_progress"}
            onUploaded={() => router.refresh()}
          />
        ))}
      </ul>

      {!allUploaded && attemptStatus === "in_progress" ? (
        <p className="text-xs text-muted-foreground">
          Upload every required artifact before submitting. Each upload replaces the previous one
          for that artifact kind.
        </p>
      ) : null}
    </div>
  );
}

function ArtifactSlotRow({
  slot,
  attemptId,
  disabled,
  onUploaded,
}: {
  slot: ArtifactSlot;
  attemptId: string;
  disabled: boolean;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("attemptId", attemptId);
    fd.set("kind", slot.kind);

    const result = await uploadCapstoneArtifact(fd);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    e.currentTarget.reset();
    onUploaded();
  }

  return (
    <li className="border border-rule bg-paper px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="kicker">{slot.label}</div>
        {slot.uploadedFileName ? (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--status-complete))]">
            Uploaded · {slot.uploadedFileName}
          </span>
        ) : (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Not yet uploaded
          </span>
        )}
      </div>
      {!disabled ? (
        <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="file"
            required
            className="text-xs"
            accept=".pdf,.docx,.xlsx,.pptx,.csv,.md,.txt"
          />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Uploading…" : slot.uploadedFileName ? "Replace" : "Upload"}
          </Button>
          {error ? <span className="text-xs text-[hsl(var(--destructive))]">{error}</span> : null}
        </form>
      ) : null}
    </li>
  );
}
