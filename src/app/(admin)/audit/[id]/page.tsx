import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import { RubricScoreCard, type RubricScoreRow } from "@/components/grading/rubric-score-card";
import { AuditReviewPanel } from "@/components/admin/audit-review-panel";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Audit review — Launchpad" };

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: queueRow } = await supabase
    .from("audit_queue")
    .select("id, reason, status, submission_id")
    .eq("id", id)
    .maybeSingle();
  if (!queueRow) notFound();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, original_filename, submitted_at, overall_score, pass, hire_ready, extracted_text, user_id"
    )
    .eq("id", queueRow.submission_id)
    .single();

  const { data: scoreRows } = await supabase
    .from("rubric_scores")
    .select("dimension, score, justification, quote, suggestion, rubric_id")
    .eq("submission_id", queueRow.submission_id);

  const scores: RubricScoreRow[] = (scoreRows ?? []).map((r) => ({
    dimension: r.dimension,
    score: r.score,
    justification: r.justification,
    quote: r.quote,
    suggestion: r.suggestion,
  }));

  const rubricId = scoreRows?.[0]?.rubric_id;
  const { data: rubricRow } = rubricId
    ? await supabase.from("rubrics").select("schema_json").eq("id", rubricId).single()
    : { data: null };

  const rubric = rubricRow ? parseRubric(rubricRow.schema_json) : null;

  // Latest decision on this queue row (for admins returning to a reviewed item).
  const { data: latestRecord } = await supabase
    .from("audit_records")
    .select("decision, overrides")
    .eq("audit_queue_id", queueRow.id)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const overrides = (latestRecord?.overrides as OverrideEntry[] | null) ?? null;
  const reviewedByHuman = latestRecord !== null && latestRecord !== undefined;
  const applied = rubric ? applyOverrides(scores, overrides, rubric) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <nav className="text-sm text-muted-foreground">
          <Link href="/audit" className="hover:text-foreground">
            Audit queue
          </Link>
          <span className="mx-2">→</span>
          <span>Review</span>
        </nav>
        <h1 className="text-2xl font-semibold">{submission?.original_filename}</h1>
        <p className="text-sm text-muted-foreground">
          {queueRow.reason === "requested"
            ? "Learner requested human review"
            : "Sampled for audit (10%)"}
          {" · "}
          Status: <span className="font-medium">{queueRow.status}</span>
        </p>
      </header>

      {rubric && applied && (
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
      )}

      {queueRow.status === "pending" && rubric && (
        <AuditReviewPanel
          queueId={queueRow.id}
          dimensions={rubric.dimensions.map((d) => ({
            name: d.name,
            currentScore: scores.find((s) => s.dimension === d.name)?.score ?? 3,
          }))}
        />
      )}

      {submission?.extracted_text && (
        <details className="rounded-lg border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">Submission text</summary>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-3 text-xs">
            {submission.extracted_text}
          </pre>
        </details>
      )}

      <Button asChild variant="outline">
        <Link href="/audit">Back to queue</Link>
      </Button>
    </div>
  );
}
