"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditQueue, auditRecords, submissions } from "@/db/schema";
import { getAppUser, isAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/types";
import { notifyAuditDecision } from "@/lib/email/notify-audit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres message from a Drizzle error (without the SQL text/params). */
function dbMessage(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string } | null;
  return e?.cause?.message ?? e?.message ?? "Database error";
}

// --------------------------------------------------------------------------
// Learner-initiated: flag a submission for human review.
// --------------------------------------------------------------------------
export async function requestReview(submissionId: string): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  // A malformed id can't match a row (Postgres would reject the uuid cast).
  if (!UUID_RE.test(submissionId)) {
    return { ok: false, error: "Submission not found.", code: "NOT_FOUND" };
  }

  try {
    // Owner check (was RLS on submissions): a non-owner's id reads as not found.
    const [submission] = await db
      .select({ id: submissions.id, status: submissions.status })
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.userId, user.id)))
      .limit(1);
    if (!submission) {
      return { ok: false, error: "Submission not found.", code: "NOT_FOUND" };
    }
    if (submission.status !== "graded") {
      return {
        ok: false,
        error: "Only graded submissions can be sent for review.",
        code: "NOT_ELIGIBLE",
      };
    }

    // Already queued (unique submission_id) is fine — treat as success.
    await db
      .insert(auditQueue)
      .values({ submissionId: submission.id, reason: "requested" })
      .onConflictDoNothing({ target: auditQueue.submissionId });
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }

  revalidatePath(`/submissions/${submissionId}`);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------------------------
// Admin-only: approve an audit with no changes.
// --------------------------------------------------------------------------
export async function approveAudit(queueId: string): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  if (!(await isAdmin(user.id))) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  try {
    await db.insert(auditRecords).values({
      auditQueueId: queueId,
      reviewerId: user.id,
      decision: "approved",
    });
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }

  try {
    await db.update(auditQueue).set({ status: "approved" }).where(eq(auditQueue.id, queueId));
  } catch (err) {
    // Old code ignored this error; the audit record is already written.
    console.error("[approveAudit] queue status update failed", err);
  }

  void notifyAuditDecision({ queueId, decision: "approved" });

  revalidatePath("/audit");
  revalidatePath(`/audit/${queueId}`);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------------------------
// Admin-only: override per-dimension scores with a required note.
// Original AI scores in rubric_scores are never mutated.
// --------------------------------------------------------------------------
const OverrideSchema = z.object({
  queueId: z.string().uuid(),
  note: z.string().min(10).max(1000),
  overrides: z
    .array(
      z.object({
        dimension: z.string().min(1),
        score: z.number().int().min(1).max(5),
      })
    )
    .min(1),
});

export type OverrideInput = z.input<typeof OverrideSchema>;

export async function overrideScores(input: OverrideInput): Promise<ActionResult> {
  const parsed = OverrideSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  if (!(await isAdmin(user.id))) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  try {
    await db.insert(auditRecords).values({
      auditQueueId: parsed.data.queueId,
      reviewerId: user.id,
      decision: "overridden",
      overrides: parsed.data.overrides,
      note: parsed.data.note,
    });
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }

  try {
    await db
      .update(auditQueue)
      .set({ status: "overridden" })
      .where(eq(auditQueue.id, parsed.data.queueId));
  } catch (err) {
    // Old code ignored this error; the audit record is already written.
    console.error("[overrideScores] queue status update failed", err);
  }

  void notifyAuditDecision({
    queueId: parsed.data.queueId,
    decision: "overridden",
    overrides: parsed.data.overrides,
    reviewerNote: parsed.data.note,
  });

  revalidatePath("/audit");
  revalidatePath(`/audit/${parsed.data.queueId}`);
  return { ok: true, data: undefined };
}
