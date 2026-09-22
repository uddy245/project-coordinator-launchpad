"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getAppUser, hasAccess } from "@/lib/auth/session";
import { rotateAssignment, type WorkbookAssignment } from "@/lib/workbook/select";
import type { ActionResult } from "@/lib/types";

const RefreshSchema = z.object({ lessonSlug: z.string().min(1) });

export type RefreshAssignmentData = {
  assignment: WorkbookAssignment;
  generated: boolean;
};

/**
 * Rotate to a fresh workbook scenario for the lesson. Picks an unseen
 * brief from the pool first, generates a new one via Claude only when
 * the user has seen everything. Generation is bounded by the daily
 * Anthropic spend cap and the new brief joins the global pool.
 */
export async function refreshWorkbookAssignment(
  input: z.input<typeof RefreshSchema>
): Promise<ActionResult<RefreshAssignmentData>> {
  const parsed = RefreshSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  let lesson: { id: string; title: string; summary: string | null; competency: string } | null =
    null;
  try {
    const [row] = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        summary: lessons.summary,
        competency: lessons.competency,
      })
      .from(lessons)
      .where(and(eq(lessons.slug, parsed.data.lessonSlug), eq(lessons.isPublished, true)))
      .limit(1);
    // lessons: published AND has_access (hasAccess is true for admins).
    if (row && (await hasAccess(user.id))) lesson = row;
  } catch {
    lesson = null;
  }
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  try {
    // workbook_assignment_seen is scoped by the session user id we pass.
    const result = await rotateAssignment({
      userId: user.id,
      lessonId: lesson.id,
      lessonSlug: parsed.data.lessonSlug,
      lessonTitle: lesson.title,
      lessonSummary: lesson.summary,
      competency: lesson.competency,
    });
    revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refresh failed",
      code: "REFRESH_FAILED",
    };
  }
}
