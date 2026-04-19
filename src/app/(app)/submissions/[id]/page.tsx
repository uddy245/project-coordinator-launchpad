import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import { RubricScoreCard, type RubricScoreRow } from "@/components/grading/rubric-score-card";
import { GradingInProgress } from "@/components/grading/grading-in-progress";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Submission — Launchpad" };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, status, original_filename, submitted_at, overall_score, pass, hire_ready, extracted_text, lesson_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission) notFound();

  // Breadcrumb back to the lesson
  const { data: lesson } = await supabase
    .from("lessons")
    .select("slug, title")
    .eq("id", submission.lesson_id)
    .maybeSingle();

  void user; // reserved for future per-user annotations

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <nav className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          {lesson && (
            <>
              <span className="mx-2">→</span>
              <Link href={`/lessons/${lesson.slug}`} className="hover:text-foreground">
                {lesson.title}
              </Link>
            </>
          )}
          <span className="mx-2">→</span>
          <span>Submission</span>
        </nav>
        <h1 className="text-2xl font-semibold">{submission.original_filename}</h1>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(submission.submitted_at).toLocaleString()}
        </p>
      </header>

      {submission.status === "pending" || submission.status === "grading" ? (
        <GradingInProgress submissionId={submission.id} />
      ) : submission.status === "grading_failed" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold">We couldn&apos;t grade this submission.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong during grading. The admin has been notified. You can retry by
            uploading again.
          </p>
          {lesson && (
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/lessons/${lesson.slug}?tab=workbook`}>Back to lesson</Link>
            </Button>
          )}
        </div>
      ) : submission.status === "manual_review" ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-sm">
          This submission is with the review team — you&apos;ll see the result here once
          they&apos;re done.
        </div>
      ) : (
        // Graded
        <GradedView submissionId={submission.id} />
      )}

      {submission.extracted_text && (
        <details className="rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">What the grader read</summary>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs">
            {submission.extracted_text}
          </pre>
        </details>
      )}
    </div>
  );
}

async function GradedView({ submissionId }: { submissionId: string }) {
  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("submissions")
    .select("overall_score, pass, hire_ready")
    .eq("id", submissionId)
    .single();

  const { data: scoreRows } = await supabase
    .from("rubric_scores")
    .select("dimension, score, justification, quote, suggestion, rubric_id")
    .eq("submission_id", submissionId);

  if (!scoreRows || scoreRows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No rubric scores recorded.
      </div>
    );
  }

  // All rubric_scores rows for one submission share a rubric_id.
  const rubricId = scoreRows[0]!.rubric_id;
  const { data: rubricRow } = await supabase
    .from("rubrics")
    .select("schema_json")
    .eq("id", rubricId)
    .single();
  if (!rubricRow) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Rubric metadata missing.
      </div>
    );
  }

  const rubric = parseRubric(rubricRow.schema_json);
  const scores: RubricScoreRow[] = scoreRows.map((r) => ({
    dimension: r.dimension,
    score: r.score,
    justification: r.justification,
    quote: r.quote,
    suggestion: r.suggestion,
  }));

  // Pull the latest human decision across any audit_queue row for this
  // submission. Overrides merge into the display; a bare approval still
  // earns the "Reviewed by human" badge.
  const { data: queueRows } = await supabase
    .from("audit_queue")
    .select("id")
    .eq("submission_id", submissionId);
  const queueIds = (queueRows ?? []).map((r) => r.id);
  const { data: latestRecord } = queueIds.length
    ? await supabase
        .from("audit_records")
        .select("decision, overrides")
        .in("audit_queue_id", queueIds)
        .order("decided_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const overrides = (latestRecord?.overrides as OverrideEntry[] | null) ?? null;
  const reviewedByHuman = latestRecord !== null && latestRecord !== undefined;
  const applied = applyOverrides(scores, overrides, rubric);

  return (
    <RubricScoreCard
      rubric={rubric}
      scores={applied.scores}
      overallScore={
        applied.hasOverrides ? applied.overallScore : (submission?.overall_score ?? null)
      }
      pass={applied.hasOverrides ? applied.pass : (submission?.pass ?? null)}
      hireReady={applied.hasOverrides ? applied.hireReady : (submission?.hire_ready ?? null)}
      overriddenDimensions={applied.overriddenDimensions}
      reviewedByHuman={reviewedByHuman}
    />
  );
}
