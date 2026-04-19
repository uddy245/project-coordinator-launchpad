import Link from "next/link";
import { Button } from "@/components/ui/button";

type Status = "not_started" | "in_progress" | "completed";

const CTA: Record<Status, string> = {
  not_started: "Start lesson",
  in_progress: "Continue",
  completed: "Review",
};

const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export function LessonCard({
  number,
  title,
  summary,
  slug,
  estimatedMinutes,
  status,
}: {
  number: number;
  title: string;
  summary: string | null;
  slug: string;
  estimatedMinutes: number | null;
  status: Status;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Lesson {number}
            {estimatedMinutes ? ` · ${estimatedMinutes} min` : null}
          </p>
          <h2 className="text-xl font-semibold">{title}</h2>
          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {STATUS_LABEL[status]}
        </span>
      </div>
      <Button asChild className="mt-4">
        <Link href={`/lessons/${slug}`}>{CTA[status]}</Link>
      </Button>
    </div>
  );
}
