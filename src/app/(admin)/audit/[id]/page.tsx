import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditQueue, auditRecords, rubricScores, rubrics, submissions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-user";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import { RubricScoreCard, type RubricScoreRow } from "@/components/grading/rubric-score-card";
import { AuditReviewPanel } from "@/components/admin/audit-review-panel";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Audit review — Launchpad" };

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Previously relied on is_admin() RLS; there is no RLS now, so the admin
  // check below (plus the layout's) is what scopes these unfiltered queries.
  await requireAdmin();
  const { id } = await params;

  // Non-UUID ids would make Postgres throw; treat them as not found.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const [queueRow] = await db
    .select({
      id: auditQueue.id,
      reason: auditQueue.reason,
      status: auditQueue.status,
      submission_id: auditQueue.submissionId,
    })
    .from(auditQueue)
    .where(eq(auditQueue.id, id))
    .limit(1);
  if (!queueRow) notFound();

  const [submission] = await db
    .select({
      id: submissions.id,
      original_filename: submissions.originalFilename,
      submitted_at: submissions.submittedAt,
      overall_score: submissions.overallScore,
      pass: submissions.pass,
      hire_ready: submissions.hireReady,
      extracted_text: submissions.extractedText,
      user_id: submissions.userId,
    })
    .from(submissions)
    .where(eq(submissions.id, queueRow.submission_id))
    .limit(1);

  const scoreRows = await db
    .select({
      dimension: rubricScores.dimension,
      score: rubricScores.score,
      justification: rubricScores.justification,
      quote: rubricScores.quote,
      suggestion: rubricScores.suggestion,
      rubric_id: rubricScores.rubricId,
    })
    .from(rubricScores)
    .where(eq(rubricScores.submissionId, queueRow.submission_id));

  const scores: RubricScoreRow[] = scoreRows.map((r) => ({
    dimension: r.dimension,
    score: r.score,
    justification: r.justification,
    quote: r.quote,
    // Column is nullable; the card expects a string.
    suggestion: r.suggestion ?? "",
  }));

  const rubricId = scoreRows[0]?.rubric_id;
  const [rubricRow] = rubricId
    ? await db
        .select({ schema_json: rubrics.schemaJson })
        .from(rubrics)
        .where(eq(rubrics.id, rubricId))
        .limit(1)
    : [];

  const rubric = rubricRow ? parseRubric(rubricRow.schema_json) : null;

  // Latest decision on this queue row (for admins returning to a reviewed item).
  const [latestRecord] = await db
    .select({ decision: auditRecords.decision, overrides: auditRecords.overrides })
    .from(auditRecords)
    .where(eq(auditRecords.auditQueueId, queueRow.id))
    .orderBy(desc(auditRecords.decidedAt))
    .limit(1);
  const overrides = (latestRecord?.overrides as OverrideEntry[] | null) ?? null;
  const reviewedByHuman = latestRecord !== undefined;
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
