import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditQueue, auditRecords, lessons, rubricScores, rubrics, submissions } from "@/db/schema";
import { hasAccess, isAdmin } from "@/lib/auth/session";
import { canViewLesson } from "@/lib/lessons/access";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import { RubricScoreCard, type RubricScoreRow } from "@/components/grading/rubric-score-card";
import { GradingInProgress } from "@/components/grading/grading-in-progress";
import { RequestReviewButton } from "@/components/grading/request-review-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Submission — Launchpad" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  // Malformed ids would make Postgres throw on the uuid cast.
  if (!UUID_RE.test(id)) notFound();

  // submissions (was RLS): owner only, unless admin. Another user's id
  // returns 404 exactly like a missing one.
  const [admin, access] = await Promise.all([isAdmin(user.id), hasAccess(user.id)]);

  const [submission] = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      original_filename: submissions.originalFilename,
      submitted_at: submissions.submittedAt,
      overall_score: submissions.overallScore,
      pass: submissions.pass,
      hire_ready: submissions.hireReady,
      extracted_text: submissions.extractedText,
      lesson_id: submissions.lessonId,
    })
    .from(submissions)
    .where(and(eq(submissions.id, id), admin ? undefined : eq(submissions.userId, user.id)))
    .limit(1);

  if (!submission) notFound();

  // Breadcrumb back to the lesson. lessons (was RLS): free previews for
  // everyone, other published lessons need has_access; admins see all.
  const [lessonRow] = await db
    .select({
      slug: lessons.slug,
      title: lessons.title,
      isPublished: lessons.isPublished,
      isPreview: lessons.isPreview,
    })
    .from(lessons)
    .where(eq(lessons.id, submission.lesson_id))
    .limit(1);
  const lesson = lessonRow && (await canViewLesson(user.id, lessonRow)) ? lessonRow : undefined;

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
        <GradedView
          submission={{
            id: submission.id,
            overall_score: submission.overall_score,
            pass: submission.pass,
            hire_ready: submission.hire_ready,
          }}
          viewerId={user.id}
          viewerIsAdmin={admin}
          // A free preview lesson's grade is usable without purchase.
          viewerHasAccess={access || !!lesson}
        />
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

/**
 * Only ever called with a submission the page has already verified the
 * viewer owns (or the viewer is an admin), so the rubric_scores /
 * audit_* reads below are scoped to that checked submission id.
 */
async function GradedView({
  submission,
  viewerId,
  viewerIsAdmin,
  viewerHasAccess,
}: {
  submission: {
    id: string;
    overall_score: number | null;
    pass: boolean | null;
    hire_ready: boolean | null;
  };
  viewerId: string;
  viewerIsAdmin: boolean;
  viewerHasAccess: boolean;
}) {
  const submissionId = submission.id;

  // Defence in depth: re-assert ownership in the same query that loads
  // the scores (rubric_scores RLS was "owner via submissions.user_id").
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
    .innerJoin(submissions, eq(submissions.id, rubricScores.submissionId))
    .where(
      and(
        eq(rubricScores.submissionId, submissionId),
        viewerIsAdmin ? undefined : eq(submissions.userId, viewerId)
      )
    );

  if (scoreRows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No rubric scores recorded.
      </div>
    );
  }

  // All rubric_scores rows for one submission share a rubric_id.
  const rubricId = scoreRows[0]!.rubric_id;
  // rubrics (was RLS): is_current AND has_access for learners; admins all.
  const [rubricRow] =
    viewerIsAdmin || viewerHasAccess
      ? await db
          .select({ schema_json: rubrics.schemaJson })
          .from(rubrics)
          .where(
            and(eq(rubrics.id, rubricId), viewerIsAdmin ? undefined : eq(rubrics.isCurrent, true))
          )
          .limit(1)
      : [];
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
    suggestion: r.suggestion ?? "",
  }));

  // Pull the latest human decision across any audit_queue row for this
  // submission. Overrides merge into the display; a bare approval still
  // earns the "Reviewed by human" badge.
  // audit_queue rows for this (already ownership-checked) submission, and
  // audit_records hanging off them (learner may read records for their
  // own submission; admins all).
  const queueRows = await db
    .select({ id: auditQueue.id })
    .from(auditQueue)
    .where(eq(auditQueue.submissionId, submissionId));
  const queueIds = queueRows.map((r) => r.id);
  const [latestRecord] = queueIds.length
    ? await db
        .select({ decision: auditRecords.decision, overrides: auditRecords.overrides })
        .from(auditRecords)
        .where(inArray(auditRecords.auditQueueId, queueIds))
        .orderBy(desc(auditRecords.decidedAt))
        .limit(1)
    : [];

  const overrides = (latestRecord?.overrides as OverrideEntry[] | null) ?? null;
  const reviewedByHuman = latestRecord !== null && latestRecord !== undefined;
  const alreadyQueued = queueIds.length > 0 && !reviewedByHuman;
  const applied = applyOverrides(scores, overrides, rubric);

  return (
    <div className="space-y-6">
      <RubricScoreCard
        rubric={rubric}
        scores={applied.scores}
        overallScore={applied.hasOverrides ? applied.overallScore : submission.overall_score}
        pass={applied.hasOverrides ? applied.pass : submission.pass}
        hireReady={applied.hasOverrides ? applied.hireReady : submission.hire_ready}
        overriddenDimensions={applied.overriddenDimensions}
        reviewedByHuman={reviewedByHuman}
      />
      <RequestReviewButton
        submissionId={submissionId}
        alreadyReviewed={reviewedByHuman}
        alreadyQueued={alreadyQueued}
      />
    </div>
  );
}
