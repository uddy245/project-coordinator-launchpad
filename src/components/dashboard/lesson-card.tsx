import Link from "next/link";

type Status = "not_started" | "in_progress" | "completed";

const STATUS_LABEL: Record<Status, string> = {
  not_started: "Locked-in",
  in_progress: "In progress",
  completed: "Completed",
};

const CTA: Record<Status, string> = {
  not_started: "Begin module",
  in_progress: "Continue →",
  completed: "Review →",
};

export function LessonCard({
  number,
  title,
  summary,
  slug,
  estimatedMinutes,
  status,
  isNext,
}: {
  number: number;
  title: string;
  summary: string | null;
  slug: string;
  estimatedMinutes: number | null;
  status: Status;
  isNext?: boolean;
}) {
  const moduleCode = `M${String(number).padStart(2, "0")}`;
  return (
    <Link href={`/lessons/${slug}`} className="group block">
      <article
        className="tile grid grid-cols-12 items-stretch gap-0"
        data-current={isNext ? "true" : undefined}
      >
        {/* Module code column */}
        <div className="col-span-12 border-b border-rule p-5 sm:col-span-2 sm:border-b-0 sm:border-r">
          <div className="kicker text-[0.7rem]">Module</div>
          <div className="data-numeral mt-1 text-[2rem] leading-none text-ink">
            {moduleCode}
          </div>
          {estimatedMinutes ? (
            <div className="mt-3 text-xs text-muted-foreground">
              {estimatedMinutes} min
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="col-span-12 space-y-2 p-5 sm:col-span-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="pip" data-status={status}>
              {STATUS_LABEL[status]}
            </span>
            {isNext ? (
              <span className="rounded-sm bg-[hsl(var(--accent))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                Up next
              </span>
            ) : null}
          </div>
          <h3 className="display-title text-[1.35rem] sm:text-[1.55rem]">{title}</h3>
          {summary ? (
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>

        {/* CTA column */}
        <div className="col-span-12 flex items-center justify-between gap-3 border-t border-rule p-5 sm:col-span-3 sm:justify-end sm:border-l sm:border-t-0">
          <span className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink transition-transform group-hover:translate-x-0.5">
            {CTA[status]}
          </span>
        </div>
      </article>
    </Link>
  );
}
