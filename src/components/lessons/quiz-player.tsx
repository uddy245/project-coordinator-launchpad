"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAttempt, type SubmitQuizData } from "@/actions/quiz";
import { Button } from "@/components/ui/button";

type QuizOption = { id: string; text: string };

export type QuizItemPublic = {
  id: string;
  sort: number;
  stem: string;
  options: QuizOption[];
  competency: string;
  difficulty: "easy" | "medium" | "hard";
};

export function QuizPlayer({ lessonSlug, items }: { lessonSlug: string; items: QuizItemPublic[] }) {
  const total = items.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizData | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = items[index];
  const allAnswered = useMemo(() => items.every((it) => answers[it.id]), [items, answers]);

  if (!current) {
    return <p className="text-sm text-muted-foreground">No quiz items available.</p>;
  }

  if (result) {
    return <QuizResults items={items} result={result} onRetry={handleRetry} />;
  }

  function select(choice: string) {
    if (!current) return;
    setAnswers((a) => ({ ...a, [current.id]: choice }));
  }

  function submit() {
    const payload = items.map((it) => ({ itemId: it.id, choice: answers[it.id] ?? "" }));
    startTransition(async () => {
      const res = await submitQuizAttempt({ lessonSlug, answers: payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(res.data);
    });
  }

  function handleRetry() {
    setAnswers({});
    setIndex(0);
    setResult(null);
  }

  const chosen = answers[current.id];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between text-sm text-muted-foreground">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>{Object.keys(answers).length} answered</span>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-base font-medium leading-relaxed">{current.stem}</h3>
        <ul className="mt-4 space-y-2">
          {current.options.map((o) => {
            const isChosen = chosen === o.id;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => select(o.id)}
                  className={
                    "w-full rounded-md border p-3 text-left transition-colors " +
                    (isChosen
                      ? "border-foreground bg-muted"
                      : "border-border hover:border-muted-foreground/50")
                  }
                >
                  <span className="mr-2 font-mono text-xs uppercase text-muted-foreground">
                    {o.id}
                  </span>
                  {o.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Back
        </Button>
        {index < total - 1 ? (
          <Button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={!chosen}
          >
            Next
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={!allAnswered || isPending}>
            {isPending ? "Scoring..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizResults({
  items,
  result,
  onRetry,
}: {
  items: QuizItemPublic[];
  result: SubmitQuizData;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div
        className={
          "rounded-lg border p-6 " +
          (result.passed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50")
        }
      >
        <h3 className="text-xl font-semibold">
          {result.score} of {result.total} {result.passed ? "— passed" : "— keep going"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.passed
            ? "Strong grounding. Review anything you got wrong, then move on."
            : "Below the 8/10 threshold. Review the rationale on each miss and retry — failing does not block progression."}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((it, i) => {
          const p = result.perItem.find((pi) => pi.itemId === it.id);
          if (!p) return null;
          const chosenText = it.options.find((o) => o.id === p.chosen)?.text;
          return (
            <li
              key={it.id}
              className={
                "rounded-md border p-4 " +
                (p.correct ? "border-green-200 bg-green-50/40" : "border-red-200 bg-red-50/40")
              }
            >
              <p className="text-sm font-medium">
                {i + 1}. {it.stem}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-mono text-xs uppercase text-muted-foreground">
                  {p.correct ? "Correct" : "You chose"}
                </span>{" "}
                {chosenText ?? <em>(no answer)</em>}
              </p>
              {!p.correct && p.rationale && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">Why:</span> {p.rationale}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
