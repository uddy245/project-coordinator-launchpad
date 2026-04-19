import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Grading…", tone: "bg-blue-100 text-blue-900" },
  grading: { label: "Grading…", tone: "bg-blue-100 text-blue-900" },
  graded: { label: "Graded", tone: "bg-green-100 text-green-900" },
  grading_failed: { label: "Failed", tone: "bg-amber-100 text-amber-900" },
  manual_review: { label: "Under review", tone: "bg-muted text-muted-foreground" },
};

export async function SubmissionHistory({ lessonId }: { lessonId: string }) {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, original_filename, status, overall_score, submitted_at")
    .eq("lesson_id", lessonId)
    .order("submitted_at", { ascending: false });

  if (!submissions || submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t submitted an artifact for this lesson yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border bg-card">
      {submissions.map((s) => {
        const status = STATUS_LABELS[s.status] ?? {
          label: s.status,
          tone: "bg-muted",
        };
        return (
          <li key={s.id}>
            <Link
              href={`/submissions/${s.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.original_filename}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.submitted_at).toLocaleString()}
                </p>
              </div>
              {s.overall_score !== null && s.status === "graded" && (
                <span className="text-sm font-semibold">
                  {Number(s.overall_score).toFixed(1)} / 5
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}>
                {status.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
