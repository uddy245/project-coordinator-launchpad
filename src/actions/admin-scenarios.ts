"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { mockInterviewResponses, mockInterviewScenarios } from "@/db/schema";
import { getAppUser, isAdmin } from "@/lib/auth/session";
import { ScenarioSchema } from "@/lib/interviews/schema";
import type { ActionResult } from "@/lib/types";

export type AdminScenarioInput = z.input<typeof ScenarioSchema>;

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function requireAdmin() {
  const user = await getAppUser().catch(() => null);
  if (!user)
    return { ok: false as const, error: "Not signed in.", code: "UNAUTHENTICATED" as const };
  // Fail closed: a lookup error is treated as "not an admin".
  const admin = await isAdmin(user.id).catch(() => false);
  if (!admin) return { ok: false as const, error: "Not authorized.", code: "FORBIDDEN" as const };
  return { ok: true as const };
}

export async function upsertScenario(
  input: AdminScenarioInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = ScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const payload = {
    slug: parsed.data.slug,
    prompt: parsed.data.prompt,
    category: parsed.data.category,
    difficulty: parsed.data.difficulty,
    competency: parsed.data.competency,
    sort: parsed.data.sort,
    isPublished: parsed.data.is_published,
    rubricSummary: parsed.data.rubric_summary || null,
    updatedAt: new Date().toISOString(),
  };

  let data: { id: string; slug: string } | undefined;
  try {
    [data] = await db
      .insert(mockInterviewScenarios)
      .values(payload)
      .onConflictDoUpdate({
        target: mockInterviewScenarios.slug,
        set: {
          prompt: payload.prompt,
          category: payload.category,
          difficulty: payload.difficulty,
          competency: payload.competency,
          sort: payload.sort,
          isPublished: payload.isPublished,
          rubricSummary: payload.rubricSummary,
          updatedAt: payload.updatedAt,
        },
      })
      .returning({ id: mockInterviewScenarios.id, slug: mockInterviewScenarios.slug });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save scenario: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }
  if (!data) {
    return { ok: false, error: "Failed to save scenario: no row returned", code: "DB_ERROR" };
  }

  revalidatePath("/admin/scenarios");
  revalidatePath("/interviews");
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function deleteScenario(scenarioId: string): Promise<ActionResult<{ id: string }>> {
  if (!scenarioId) {
    return { ok: false, error: "Missing id.", code: "INVALID_INPUT" };
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  try {
    // Hard refusal if there are graded responses; caller should unpublish instead.
    const [responses] = await db
      .select({ n: count() })
      .from(mockInterviewResponses)
      .where(eq(mockInterviewResponses.scenarioId, scenarioId));
    const responseCount = Number(responses?.n ?? 0);
    if (responseCount > 0) {
      return {
        ok: false,
        error: `Cannot delete — ${responseCount} learner responses exist. Unpublish instead.`,
        code: "CONFLICT",
      };
    }

    await db.delete(mockInterviewScenarios).where(eq(mockInterviewScenarios.id, scenarioId));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to delete: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/scenarios");
  revalidatePath("/interviews");
  return { ok: true, data: { id: scenarioId } };
}
