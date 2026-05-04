"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, summary, competency")
    .eq("slug", parsed.data.lessonSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  try {
    const result = await rotateAssignment({
      supabase: admin,
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
