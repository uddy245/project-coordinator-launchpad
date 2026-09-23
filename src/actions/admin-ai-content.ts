"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  mockInterviewResponses,
  mockInterviewScenarios,
  quizItems,
  workbookAssignments,
} from "@/db/schema";
import { getAppUser, isAdmin } from "@/lib/auth/session";
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

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function requireAdminGate(): Promise<ActionResult<true>> {
  const user = await getAppUser().catch(() => null);
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  // Fail closed: a lookup error is treated as "not an admin".
  const admin = await isAdmin(user.id).catch(() => false);
  if (!admin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };
  return { ok: true, data: true };
}

// Quiz items ──────────────────────────────────────────────────────────

export async function deleteAiQuizItem(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  try {
    // Refuse if it's not actually AI-generated — admin can use the lesson
    // builder for hand-authored items. Prevents fat-finger from this page
    // wiping seed data.
    const [row] = await db
      .select({ id: quizItems.id, is_ai_generated: quizItems.isAiGenerated })
      .from(quizItems)
      .where(eq(quizItems.id, parsed.data.id))
      .limit(1);
    if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
    if (!row.is_ai_generated) {
      return {
        ok: false,
        error: "Refusing to delete an authored item from this page.",
        code: "CONFLICT",
      };
    }

    await db.delete(quizItems).where(eq(quizItems.id, parsed.data.id));
  } catch (err) {
    return { ok: false, error: `Delete failed: ${errMsg(err)}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  return { ok: true, data: { id: parsed.data.id } };
}

// Mock-interview scenarios ────────────────────────────────────────────

export async function toggleAiScenarioPublished(
  id: string
): Promise<ActionResult<{ id: string; is_published: boolean }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  let next: boolean;
  try {
    const [row] = await db
      .select({
        id: mockInterviewScenarios.id,
        is_ai_generated: mockInterviewScenarios.isAiGenerated,
        is_published: mockInterviewScenarios.isPublished,
      })
      .from(mockInterviewScenarios)
      .where(eq(mockInterviewScenarios.id, parsed.data.id))
      .limit(1);
    if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
    if (!row.is_ai_generated) {
      return {
        ok: false,
        error: "Refusing to toggle an authored scenario from this page.",
        code: "CONFLICT",
      };
    }

    next = !row.is_published;
    await db
      .update(mockInterviewScenarios)
      .set({ isPublished: next, updatedAt: new Date().toISOString() })
      .where(eq(mockInterviewScenarios.id, parsed.data.id));
  } catch (err) {
    return { ok: false, error: `Update failed: ${errMsg(err)}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  revalidatePath("/interviews");
  return { ok: true, data: { id: parsed.data.id, is_published: next } };
}

export async function deleteAiScenario(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  try {
    const [row] = await db
      .select({
        id: mockInterviewScenarios.id,
        is_ai_generated: mockInterviewScenarios.isAiGenerated,
      })
      .from(mockInterviewScenarios)
      .where(eq(mockInterviewScenarios.id, parsed.data.id))
      .limit(1);
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
    const [responses] = await db
      .select({ n: count() })
      .from(mockInterviewResponses)
      .where(eq(mockInterviewResponses.scenarioId, parsed.data.id));
    const responseCount = Number(responses?.n ?? 0);
    if (responseCount > 0) {
      return {
        ok: false,
        error: `Cannot delete — ${responseCount} learner responses exist. Unpublish instead.`,
        code: "CONFLICT",
      };
    }

    await db.delete(mockInterviewScenarios).where(eq(mockInterviewScenarios.id, parsed.data.id));
  } catch (err) {
    return { ok: false, error: `Delete failed: ${errMsg(err)}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  revalidatePath("/interviews");
  return { ok: true, data: { id: parsed.data.id } };
}

// Workbook assignments ────────────────────────────────────────────────

export async function deleteAiWorkbookAssignment(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "Invalid id", code: "INVALID_INPUT" };

  const gate = await requireAdminGate();
  if (!gate.ok) return gate;

  try {
    const [row] = await db
      .select({ id: workbookAssignments.id, is_ai_generated: workbookAssignments.isAiGenerated })
      .from(workbookAssignments)
      .where(eq(workbookAssignments.id, parsed.data.id))
      .limit(1);
    if (!row) return { ok: false, error: "Not found.", code: "NOT_FOUND" };
    if (!row.is_ai_generated) {
      return {
        ok: false,
        error: "Refusing to delete an authored assignment from this page.",
        code: "CONFLICT",
      };
    }

    // workbook_assignment_seen rows cascade-delete via FK; nothing else to clean.
    await db.delete(workbookAssignments).where(eq(workbookAssignments.id, parsed.data.id));
  } catch (err) {
    return { ok: false, error: `Delete failed: ${errMsg(err)}`, code: "DB_ERROR" };
  }

  revalidatePath("/admin/ai-content");
  return { ok: true, data: { id: parsed.data.id } };
}
