import { DimensionRow } from "./dimension-row";
import type { RubricJSON } from "@/lib/grading/rubric";

export type RubricScoreRow = {
  dimension: string;
  score: number;
  justification: string;
  quote: string | null;
  suggestion: string;
};

type Props = {
  rubric: RubricJSON;
  scores: RubricScoreRow[];
  overallScore: number | null;
  pass: boolean | null;
  hireReady: boolean | null;
};

export function RubricScoreCard({ rubric, scores, overallScore, pass, hireReady }: Props) {
  // Render dimensions in the rubric's defined order (not the order the
  // scores were inserted). Missing score for a dimension = something
  // went wrong upstream; don't render that row rather than crash.
  const byDimension = new Map(scores.map((s) => [s.dimension, s]));

  return (
    <div className="space-y-6">
      <header
        className={
          "rounded-lg border p-5 " +
          (pass ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50")
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {rubric.competency_label ?? rubric.competency}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {overallScore !== null ? overallScore.toFixed(1) : "—"}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ 5</span>
            </h2>
          </div>
          <div className="flex gap-2">
            {pass !== null && (
              <Badge tone={pass ? "good" : "warn"}>{pass ? "Passed" : "Below pass"}</Badge>
            )}
            {hireReady && <Badge tone="great">Hire-ready</Badge>}
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {rubric.dimensions.map((d) => {
          const s = byDimension.get(d.name);
          if (!s) return null;
          return (
            <DimensionRow
              key={d.name}
              dimension={d}
              score={s.score}
              justification={s.justification}
              quote={s.quote}
              suggestion={s.suggestion}
            />
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ tone, children }: { tone: "great" | "good" | "warn"; children: React.ReactNode }) {
  const cls = {
    great: "bg-green-600 text-white",
    good: "bg-blue-100 text-blue-900",
    warn: "bg-amber-100 text-amber-900",
  }[tone];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}
