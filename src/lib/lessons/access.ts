import "server-only";
import { and, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { lessons, profiles } from "@/db/schema";

export type LessonGate = { isPublished: boolean; isPreview: boolean };

/**
 * Can this signed-in user use this lesson (page, video, quiz, workbook,
 * submissions)? Replaces the old RLS policies on `lessons`:
 *   - free preview lessons (published + is_preview) — anyone, paid or not
 *   - other published lessons — learners with has_access
 *   - admins — everything, including unpublished drafts
 */
export async function canViewLesson(userId: string, lesson: LessonGate): Promise<boolean> {
  if (lesson.isPublished && lesson.isPreview) return true;
  const [row] = await db
    .select({ role: profiles.role, hasAccess: profiles.hasAccess })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (row?.role === "admin") return true;
  return lesson.isPublished && !!row?.hasAccess;
}

/**
 * The same rule as canViewLesson, as a WHERE condition on `lessons` for list
 * queries: admins → no filter (undefined); paid learners → published;
 * everyone else → published free previews.
 */
export async function visibleLessonsFilter(userId: string): Promise<SQL | undefined> {
  const [row] = await db
    .select({ role: profiles.role, hasAccess: profiles.hasAccess })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (row?.role === "admin") return undefined;
  if (row?.hasAccess) return eq(lessons.isPublished, true);
  return and(eq(lessons.isPublished, true), eq(lessons.isPreview, true));
}
