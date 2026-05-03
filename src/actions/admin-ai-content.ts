"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────
// Admin actions for the /admin/ai-content review page.
// All three "kinds" (quiz items, scenarios, workbook assignments) get
// delete; scenarios additionally get a publish toggle so an admin can
// hide a low-quality one without destroying it. Quiz items and workbook
// assignments don't have an is_published column today — delete is the
// only state change. Their per-user "seen" rows cascade-delete.
// ──────────────────────────────────────────────────────────────────────

const IdSchema = z.object({ id: z.string().uuid() });

async function requireAdminGate(): Promise<ActionResult<true>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };
  return { ok: true, data: true };
}

// Quiz items ──────────────────────────────────────────────────────────

export async function deleteAiQuizItem(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  const admin = createAdminClient();
  // Refuse if it's not actually AI-generated — admin can use the lesson
  // builder for hand-authored items. Prevents fat-finger from this page
  // wiping seed data.
  const { data: row } = await admin
    .from("quiz_items")
    .select("id, is_ai_generated")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
  if (!row.is_ai_generated) {
    return {
      ok: false,
      error: "Refusing to delete an authored item from this page.",
      code: "CONFLICT",
    };
  }

  const { error } = await admin.from("quiz_items").delete().eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: `Delete failed: ${error.message}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  return { ok: true, data: { id: parsed.data.id } };
}

// Mock-interview scenarios ────────────────────────────────────────────

export async function toggleAiScenarioPublished(
  id: string,
): Promise<ActionResult<{ id: string; is_published: boolean }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interview_scenarios")
    .select("id, is_ai_generated, is_published")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
  if (!row.is_ai_generated) {
    return {
      ok: false,
      error: "Refusing to toggle an authored scenario from this page.",
      code: "CONFLICT",
    };
  }

  const next = !row.is_published;
  const { error } = await admin
    .from("mock_interview_scenarios")
    .update({ is_published: next, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: `Update failed: ${error.message}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  revalidatePath("/interviews");
  return { ok: true, data: { id: parsed.data.id, is_published: next } };
}

export async function deleteAiScenario(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interview_scenarios")
    .select("id, is_ai_generated")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
  if (!row.is_ai_generated) {
    return {
      ok: false,
      error: "Refusing to delete an authored scenario from this page.",
      code: "CONFLICT",
    };
  }

  // Same hard refusal as the existing deleteScenario action — preserve
  // learner responses; admin should unpublish instead.
  const { count } = await admin
    .from("mock_interview_responses")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", parsed.data.id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${count} learner responses exist. Unpublish instead.`,
      code: "CONFLICT",
    };
  }

  const { error } = await admin
    .from("mock_interview_scenarios")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: `Delete failed: ${error.message}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  revalidatePath("/interviews");
  return { ok: true, data: { id: parsed.data.id } };
}

// Workbook assignments ────────────────────────────────────────────────

export async function deleteAiWorkbookAssignment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("workbook_assignments")
    .select("id, is_ai_generated")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
  if (!row.is_ai_generated) {
    return {
      ok: false,
      error: "Refusing to delete an authored assignment from this page.",
      code: "CONFLICT",
    };
  }

  // workbook_assignment_seen rows cascade-delete via FK; nothing else to clean.
  const { error } = await admin
    .from("workbook_assignments")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: `Delete failed: ${error.message}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  return { ok: true, data: { id: parsed.data.id } };
}
