/**
 * Audit decision notifier — looks up the relevant submission/lesson/user,
 * recomputes the post-override score using applyOverrides(), and sends
 * the audit-decision email. Best-effort; never throws.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditQueue,
  lessons,
  profiles,
  rubricScores,
  rubrics,
  submissions,
  usersInAuth,
} from "@/db/schema";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import type { RubricScoreRow } from "@/components/grading/rubric-score-card";
import { sendEmail } from "@/lib/email/send";
import { renderAuditDecision } from "@/lib/email/templates/audit-decision";

export type AuditNotifyArgs = {
  queueId: string;
  decision: "approved" | "overridden";
  overrides?: OverrideEntry[];
  reviewerNote?: string | null;
};

/** profiles.email, falling back to auth.users.email (replaces auth.admin.getUserById). */
async function getUserEmail(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (p?.email) return p.email;
  const [u] = await db
    .select({ email: usersInAuth.email })
    .from(usersInAuth)
    .where(eq(usersInAuth.id, userId))
    .limit(1);
  return u?.email ?? null;
}

export async function notifyAuditDecision(args: AuditNotifyArgs): Promise<void> {
  try {
    const [queueRow] = await db
      .select({ id: auditQueue.id, submission_id: auditQueue.submissionId })
      .from(auditQueue)
      .where(eq(auditQueue.id, args.queueId))
      .limit(1);
    if (!queueRow?.submission_id) return;

    const [sub] = await db
      .select({
        id: submissions.id,
        user_id: submissions.userId,
        overall_score: submissions.overallScore,
        lesson_slug: lessons.slug,
        lesson_title: lessons.title,
        lesson_competency: lessons.competency,
      })
      .from(submissions)
      .leftJoin(lessons, eq(lessons.id, submissions.lessonId))
      .where(eq(submissions.id, queueRow.submission_id))
      .limit(1);
    if (!sub?.user_id) return;

    const lesson = {
      slug: sub.lesson_slug,
      title: sub.lesson_title,
      competency: sub.lesson_competency,
    };

    // User id → email (profiles.email, falling back to auth.users)
    const email = await getUserEmail(sub.user_id);
    if (!email) return;

    const [profile] = await db
      .select({ full_name: profiles.fullName })
      .from(profiles)
      .where(eq(profiles.id, sub.user_id))
      .limit(1);
    const fullName = profile?.full_name ?? null;
    const firstName = fullName ? (fullName.split(/\s+/)[0] ?? null) : null;

    // 1..5 → 0..1
    const oldOverall = typeof sub.overall_score === "number" ? sub.overall_score : 0;
    const oldScoreNormalised = Math.max(0, Math.min(1, (oldOverall - 1) / 4));

    let newScoreNormalised = oldScoreNormalised;

    if (args.decision === "overridden" && args.overrides && args.overrides.length > 0) {
      // Recompute post-override overall using applyOverrides.
      if (lesson?.competency) {
        const [rubricRow] = await db
          .select({ schema_json: rubrics.schemaJson })
          .from(rubrics)
          .where(and(eq(rubrics.competency, lesson.competency), eq(rubrics.isCurrent, true)))
          .limit(1);

        const aiScores = await db
          .select({
            dimension: rubricScores.dimension,
            score: rubricScores.score,
            justification: rubricScores.justification,
            quote: rubricScores.quote,
            suggestion: rubricScores.suggestion,
          })
          .from(rubricScores)
          .where(eq(rubricScores.submissionId, queueRow.submission_id));

        if (rubricRow?.schema_json && aiScores && aiScores.length > 0) {
          const rubric = parseRubric(rubricRow.schema_json);
          const scoresAsRows: RubricScoreRow[] = aiScores.map((s) => ({
            dimension: s.dimension,
            score: s.score,
            justification: s.justification,
            quote: s.quote,
            // Column is nullable; the card type expects a string.
            suggestion: s.suggestion ?? "",
          }));
          const applied = applyOverrides(scoresAsRows, args.overrides, rubric);
          newScoreNormalised = Math.max(0, Math.min(1, (applied.overallScore - 1) / 4));
        }
      }
    }

    await sendEmail({
      to: { email, name: fullName },
      render: renderAuditDecision({
        firstName,
        lessonTitle: lesson?.title ?? "your submission",
        submissionId: queueRow.submission_id,
        oldScore: oldScoreNormalised,
        newScore: newScoreNormalised,
        outcome: args.decision === "approved" ? "approved" : "revised",
        reviewerNote: args.reviewerNote ?? null,
      }),
      silent: true,
      tag: "audit-decision",
    });
  } catch (err) {
    console.error("[email] audit-decision send failed:", err);
  }
}
