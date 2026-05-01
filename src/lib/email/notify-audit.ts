/**
 * Audit decision notifier — looks up the relevant submission/lesson/user,
 * recomputes the post-override score using applyOverrides(), and sends
 * the audit-decision email. Best-effort; never throws.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { parseRubric } from "@/lib/grading/rubric";
import { applyOverrides, type OverrideEntry } from "@/lib/grading/apply-overrides";
import type { RubricScoreRow } from "@/components/grading/rubric-score-card";
import { sendEmail } from "@/lib/email/send";
import { renderAuditDecision } from "@/lib/email/templates/audit-decision";

type AdminClient = ReturnType<typeof createAdminClient>;

export type AuditNotifyArgs = {
  queueId: string;
  decision: "approved" | "overridden";
  overrides?: OverrideEntry[];
  reviewerNote?: string | null;
};

export async function notifyAuditDecision(args: AuditNotifyArgs): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: queueRow } = await admin
      .from("audit_queue")
      .select("id, submission_id")
      .eq("id", args.queueId)
      .maybeSingle();
    if (!queueRow?.submission_id) return;

    const { data: sub } = await admin
      .from("submissions")
      .select(
        "id, user_id, overall_score, lesson:lessons(slug, title, competency)",
      )
      .eq("id", queueRow.submission_id)
      .maybeSingle();
    if (!sub?.user_id) return;

    type LessonRow = {
      slug: string | null;
      title: string | null;
      competency: string | null;
    };
    const lesson = (Array.isArray(sub.lesson) ? sub.lesson[0] : sub.lesson) as
      | LessonRow
      | null
      | undefined;

    // Auth user → email
    const { data: authUser } = await admin.auth.admin.getUserById(sub.user_id);
    const email = authUser?.user?.email;
    if (!email) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", sub.user_id)
      .maybeSingle();
    const fullName = profile?.full_name ?? null;
    const firstName = fullName ? (fullName.split(/\s+/)[0] ?? null) : null;

    // 1..5 → 0..1
    const oldOverall = typeof sub.overall_score === "number" ? sub.overall_score : 0;
    const oldScoreNormalised = Math.max(0, Math.min(1, (oldOverall - 1) / 4));

    let newScoreNormalised = oldScoreNormalised;

    if (args.decision === "overridden" && args.overrides && args.overrides.length > 0) {
      // Recompute post-override overall using applyOverrides.
      if (lesson?.competency) {
        const { data: rubricRow } = await admin
          .from("rubrics")
          .select("schema_json")
          .eq("competency", lesson.competency)
          .eq("is_current", true)
          .maybeSingle();

        const { data: aiScores } = await admin
          .from("rubric_scores")
          .select("dimension, score, justification, quote, suggestion")
          .eq("submission_id", queueRow.submission_id);

        if (rubricRow?.schema_json && aiScores && aiScores.length > 0) {
          const rubric = parseRubric(rubricRow.schema_json);
          const scoresAsRows: RubricScoreRow[] = aiScores.map((s) => ({
            dimension: s.dimension,
            score: s.score,
            justification: s.justification,
            quote: s.quote,
            suggestion: s.suggestion,
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
