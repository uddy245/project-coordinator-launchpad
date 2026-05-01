"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { notifyAuditDecision } from "@/lib/email/notify-audit";

// --------------------------------------------------------------------------
// Learner-initiated: flag a submission for human review.
// --------------------------------------------------------------------------
export async function requestReview(submissionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  // RLS on submissions keeps a non-owner from flagging a submission
  // they can't see.
  const { data: submission } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .maybeSingle();
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("audit_queue")
    .insert({ submission_id: submissionId, reason: "requested" });

  if (error) {
    // Unique violation → already queued. That's fine; surface a success
    // with a distinct code the UI can use to stop showing the button.
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, data: undefined };
    }
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }

  revalidatePath(`/submissions/${submissionId}`);
  return { ok: true, data: undefined };
}

// --------------------------------------------------------------------------
// Admin-only: approve an audit with no changes.
// --------------------------------------------------------------------------
export async function approveAudit(queueId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  const admin = createAdminClient();

  const { error: recordErr } = await admin.from("audit_records").insert({
    audit_queue_id: queueId,
    reviewer_id: user.id,
    decision: "approved",
  });
  if (recordErr) return { ok: false, error: recordErr.message, code: "DB_ERROR" };

  await admin.from("audit_queue").update({ status: "approved" }).eq("id", queueId);

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  const admin = createAdminClient();

  const { error: recordErr } = await admin.from("audit_records").insert({
    audit_queue_id: parsed.data.queueId,
    reviewer_id: user.id,
    decision: "overridden",
    overrides: parsed.data.overrides,
    note: parsed.data.note,
  });
  if (recordErr) return { ok: false, error: recordErr.message, code: "DB_ERROR" };

  await admin.from("audit_queue").update({ status: "overridden" }).eq("id", parsed.data.queueId);

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
