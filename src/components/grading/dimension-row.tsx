import type { RubricDimension } from "@/lib/grading/rubric";

type Props = {
  dimension: RubricDimension;
  score: number;
  justification: string;
  quote: string | null;
  suggestion: string;
  overridden?: boolean;
};

export function DimensionRow({
  dimension,
  score,
  justification,
  quote,
  suggestion,
  overridden = false,
}: Props) {
  const anchorText =
    dimension.anchors[String(score)] ?? dimension.anchors[nearestAnchor(score)] ?? "";

  return (
    <li className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{humanize(dimension.name)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{dimension.description}</p>
          {overridden && (
            <p className="mt-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-900">
              Adjusted by reviewer
            </p>
          )}
        </div>
        <ScorePill score={score} />
      </div>

      {anchorText && (
        <p className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="mr-2 font-medium">Anchor for {score}/5:</span>
          {anchorText}
        </p>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why</dt>
        <dd className="text-sm">{justification}</dd>

        {quote && quote.trim().length > 0 && (
          <>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quote
            </dt>
            <dd className="rounded-md border-l-2 border-foreground/30 bg-muted/30 px-3 py-2 text-sm italic">
              &ldquo;{quote}&rdquo;
            </dd>
          </>
        )}

        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next step
        </dt>
        <dd className="text-sm">{suggestion}</dd>
      </dl>
    </li>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 4
      ? "bg-green-100 text-green-900"
      : score >= 3
        ? "bg-blue-100 text-blue-900"
        : "bg-amber-100 text-amber-900";
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>
      {score} / 5
    </span>
  );
}

function humanize(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function nearestAnchor(score: number): string {
  if (score >= 4) return "5";
  if (score >= 2) return "3";
  return "1";
}
