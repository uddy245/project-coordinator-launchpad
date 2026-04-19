import Link from "next/link";

type Props = {
  submissionId: string;
  lessonTitle: string;
  filename: string;
  submittedAt: string;
  overallScore: number | null;
  pass: boolean | null;
  hireReady: boolean | null;
};

export function ArtifactCard({
  submissionId,
  lessonTitle,
  filename,
  submittedAt,
  overallScore,
  pass,
  hireReady,
}: Props) {
  return (
    <article className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {lessonTitle}
          </p>
          <h3 className="truncate text-lg font-semibold">{filename}</h3>
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(submittedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold">
            {overallScore !== null ? overallScore.toFixed(1) : "—"}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">/5</span>
          </p>
          <div className="mt-1 flex justify-end gap-1">
            {hireReady && (
              <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                Hire-ready
              </span>
            )}
            {pass !== null && !hireReady && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  pass ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"
                }`}
              >
                {pass ? "Passed" : "Below pass"}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        <Link
          href={`/submissions/${submissionId}`}
          className="font-medium text-foreground underline"
        >
          View
        </Link>
      </div>
    </article>
  );
}
