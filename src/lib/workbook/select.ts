/**
 * Pool-first workbook assignment selection.
 *
 * - getCurrentAssignment: returns the user's currently-active scenario
 *   for a lesson — the most recently seen one if any, else the lesson's
 *   default brief, else null. Read-only; called by the workbook tab on
 *   every page render.
 *
 * - rotateAssignment: picks a fresh unseen brief from the pool, falling
 *   back to AI generation. Records the pick in workbook_assignment_seen
 *   so subsequent calls give something different. Mutating; called from
 *   the "↻ New scenario" action.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateWorkbookAssignment,
  type GeneratedAssignment,
} from "@/lib/workbook/generate";

export type WorkbookAssignment = {
  id: string;
  lesson_id: string;
  title: string;
  brief: string;
  is_ai_generated: boolean;
  is_default: boolean;
  sort: number;
};

export async function getCurrentAssignment({
  supabase,
  userId,
  lessonId,
}: {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string;
}): Promise<WorkbookAssignment | null> {
  // Try the most recently seen one first.
  const { data: seenRows } = await supabase
    .from("workbook_assignment_seen")
    .select("assignment_id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .order("seen_at", { ascending: false })
    .limit(1);

  if (seenRows && seenRows.length > 0) {
    const { data: assignment } = await supabase
      .from("workbook_assignments")
      .select("id, lesson_id, title, brief, is_ai_generated, is_default, sort")
      .eq("id", seenRows[0].assignment_id)
      .maybeSingle();
    if (assignment) return assignment as WorkbookAssignment;
    // Fall through if assignment was deleted out from under the seen row.
  }

  // No seen rows — show the lesson's default brief if there is one.
  const { data: defaultRow } = await supabase
    .from("workbook_assignments")
    .select("id, lesson_id, title, brief, is_ai_generated, is_default, sort")
    .eq("lesson_id", lessonId)
    .eq("is_default", true)
    .order("sort", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (defaultRow as WorkbookAssignment | null) ?? null;
}

export async function rotateAssignment({
  supabase,
  userId,
  lessonId,
  lessonSlug,
  lessonTitle,
  lessonSummary,
  competency,
}: {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string | null;
  competency: string;
}): Promise<{ assignment: WorkbookAssignment; generated: boolean }> {
  // 1. Pull pool + this user's seen ids in parallel.
  const [{ data: pool }, { data: seenRows }] = await Promise.all([
    supabase
      .from("workbook_assignments")
      .select("id, lesson_id, title, brief, is_ai_generated, is_default, sort")
      .eq("lesson_id", lessonId)
      .order("sort", { ascending: true }),
    supabase
      .from("workbook_assignment_seen")
      .select("assignment_id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
  ]);

  const seenIds = new Set((seenRows ?? []).map((r) => r.assignment_id));
  const unseen = (pool ?? []).filter((it) => !seenIds.has(it.id));

  let assignment: WorkbookAssignment;
  let generated = false;

  if (unseen.length > 0) {
    // Pick the lowest-sort unseen one for predictable ordering across users.
    assignment = unseen[0] as WorkbookAssignment;
  } else {
    // Pool exhausted for this user — generate a new brief.
    const fresh: GeneratedAssignment = await generateWorkbookAssignment({
      lessonId,
      lessonSlug,
      lessonTitle,
      lessonSummary,
      competency,
    });
    generated = true;
    assignment = {
      id: fresh.id,
      lesson_id: fresh.lesson_id,
      title: fresh.title,
      brief: fresh.brief,
      is_ai_generated: true,
      is_default: false,
      sort: fresh.sort,
    };
  }

  // Mark the chosen assignment as seen so subsequent rotates don't repeat.
  await supabase
    .from("workbook_assignment_seen")
    .upsert(
      {
        user_id: userId,
        assignment_id: assignment.id,
        lesson_id: lessonId,
      },
      { onConflict: "user_id,assignment_id" },
    );

  return { assignment, generated };
}
