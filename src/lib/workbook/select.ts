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

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workbookAssignmentSeen, workbookAssignments } from "@/db/schema";
import { generateWorkbookAssignment, type GeneratedAssignment } from "@/lib/workbook/generate";

export type WorkbookAssignment = {
  id: string;
  lesson_id: string;
  title: string;
  brief: string;
  is_ai_generated: boolean;
  is_default: boolean;
  sort: number;
};

const assignmentColumns = {
  id: workbookAssignments.id,
  lesson_id: workbookAssignments.lessonId,
  title: workbookAssignments.title,
  brief: workbookAssignments.brief,
  is_ai_generated: workbookAssignments.isAiGenerated,
  is_default: workbookAssignments.isDefault,
  sort: workbookAssignments.sort,
};

export async function getCurrentAssignment({
  userId,
  lessonId,
}: {
  userId: string;
  lessonId: string;
}): Promise<WorkbookAssignment | null> {
  // Try the most recently seen one first.
  const seenRows = await db
    .select({ assignment_id: workbookAssignmentSeen.assignmentId })
    .from(workbookAssignmentSeen)
    .where(
      and(eq(workbookAssignmentSeen.userId, userId), eq(workbookAssignmentSeen.lessonId, lessonId))
    )
    .orderBy(desc(workbookAssignmentSeen.seenAt))
    .limit(1);

  if (seenRows.length > 0) {
    const [assignment] = await db
      .select(assignmentColumns)
      .from(workbookAssignments)
      .where(eq(workbookAssignments.id, seenRows[0].assignment_id))
      .limit(1);
    if (assignment) return assignment;
    // Fall through if assignment was deleted out from under the seen row.
  }

  // No seen rows — show the lesson's default brief if there is one.
  const [defaultRow] = await db
    .select(assignmentColumns)
    .from(workbookAssignments)
    .where(and(eq(workbookAssignments.lessonId, lessonId), eq(workbookAssignments.isDefault, true)))
    .orderBy(workbookAssignments.sort)
    .limit(1);
  return defaultRow ?? null;
}

export async function rotateAssignment({
  userId,
  lessonId,
  lessonSlug,
  lessonTitle,
  lessonSummary,
  competency,
}: {
  userId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string | null;
  competency: string;
}): Promise<{ assignment: WorkbookAssignment; generated: boolean }> {
  // 1. Pull pool + this user's seen ids in parallel.
  const [pool, seenRows] = await Promise.all([
    db
      .select(assignmentColumns)
      .from(workbookAssignments)
      .where(eq(workbookAssignments.lessonId, lessonId))
      .orderBy(workbookAssignments.sort),
    db
      .select({ assignment_id: workbookAssignmentSeen.assignmentId })
      .from(workbookAssignmentSeen)
      .where(
        and(
          eq(workbookAssignmentSeen.userId, userId),
          eq(workbookAssignmentSeen.lessonId, lessonId)
        )
      ),
  ]);

  const seenIds = new Set(seenRows.map((r) => r.assignment_id));
  const unseen = pool.filter((it) => !seenIds.has(it.id));

  let assignment: WorkbookAssignment;
  let generated = false;

  if (unseen.length > 0) {
    // Pick the lowest-sort unseen one for predictable ordering across users.
    assignment = unseen[0];
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
  const seenAt = new Date().toISOString();
  await db
    .insert(workbookAssignmentSeen)
    .values({ userId, assignmentId: assignment.id, lessonId, seenAt })
    .onConflictDoUpdate({
      target: [workbookAssignmentSeen.userId, workbookAssignmentSeen.assignmentId],
      set: { seenAt },
    });

  return { assignment, generated };
}
