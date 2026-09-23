"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { capstoneAttempts, capstoneScenarios } from "@/db/schema";
import { getAppUser, isAdmin } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/types";

const KNOWN_ARTIFACTS = [
  "charter_brief",
  "project_plan",
  "raid_log",
  "status_report_w4",
  "status_report_w12",
  "change_request",
  "closeout_note",
] as const;

const CapstoneSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  title: z.string().trim().min(3).max(160),
  brief: z.string().trim().min(50).max(20000),
  required_artifacts: z.array(z.string().min(1)).min(1).max(20),
  estimated_hours: z.number().int().min(1).max(200).optional().nullable(),
  is_published: z.boolean(),
  rubric_summary: z.string().trim().max(8000).optional().nullable(),
});

export type AdminCapstoneInput = z.input<typeof CapstoneSchema>;

export const KNOWN_CAPSTONE_ARTIFACTS = KNOWN_ARTIFACTS;

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

export async function upsertCapstone(
  input: AdminCapstoneInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = CapstoneSchema.safeParse(input);
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
    title: parsed.data.title,
    brief: parsed.data.brief,
    requiredArtifacts: parsed.data.required_artifacts,
    estimatedHours: parsed.data.estimated_hours ?? null,
    isPublished: parsed.data.is_published,
    rubricSummary: parsed.data.rubric_summary || null,
    updatedAt: new Date().toISOString(),
  };

  let data: { id: string; slug: string } | undefined;
  try {
    [data] = await db
      .insert(capstoneScenarios)
      .values(payload)
      .onConflictDoUpdate({
        target: capstoneScenarios.slug,
        set: {
          title: payload.title,
          brief: payload.brief,
          requiredArtifacts: payload.requiredArtifacts,
          estimatedHours: payload.estimatedHours,
          isPublished: payload.isPublished,
          rubricSummary: payload.rubricSummary,
          updatedAt: payload.updatedAt,
        },
      })
      .returning({ id: capstoneScenarios.id, slug: capstoneScenarios.slug });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save capstone: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }
  if (!data) {
    return { ok: false, error: "Failed to save capstone: no row returned", code: "DB_ERROR" };
  }

  revalidatePath("/admin/capstones");
  revalidatePath("/capstone");
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function deleteCapstone(capstoneId: string): Promise<ActionResult<{ id: string }>> {
  if (!capstoneId) {
    return { ok: false, error: "Missing id.", code: "INVALID_INPUT" };
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  try {
    const [attempts] = await db
      .select({ n: count() })
      .from(capstoneAttempts)
      .where(eq(capstoneAttempts.scenarioId, capstoneId));
    const attemptCount = Number(attempts?.n ?? 0);
    if (attemptCount > 0) {
      return {
        ok: false,
        error: `Cannot delete — ${attemptCount} learner attempts exist. Unpublish instead.`,
        code: "CONFLICT",
      };
    }

    await db.delete(capstoneScenarios).where(eq(capstoneScenarios.id, capstoneId));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to delete: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/capstones");
  revalidatePath("/capstone");
  return { ok: true, data: { id: capstoneId } };
}
