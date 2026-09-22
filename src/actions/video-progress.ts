"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons } from "@/db/schema";
import { getAppUser, hasAccess } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/types";

const Schema = z.object({
  lessonSlug: z.string().min(1),
  seconds: z.number().int().nonnegative(),
  duration: z.number().int().positive().optional(),
});

export type UpdateVideoProgressInput = z.input<typeof Schema>;

const WATCHED_THRESHOLD = 0.9;

export async function updateVideoProgress(
  input: UpdateVideoProgressInput
): Promise<ActionResult<{ video_watched: boolean }>> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  let lesson: { id: string } | null = null;
  try {
    const [row] = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.slug, parsed.data.lessonSlug), eq(lessons.isPublished, true)))
      .limit(1);
    // lessons: published AND has_access (was RLS; hasAccess is true for admins).
    if (row && (await hasAccess(user.id))) lesson = row;
  } catch {
    lesson = null;
  }
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // We write video_seconds_watched as monotonic max so seek-backwards
  // doesn't roll progress back. Done client-side for simplicity — the
  // player only emits monotonic values. Duration is stored so we can
  // recompute the 90% threshold if the content length is updated.
  const video_watched =
    parsed.data.duration !== undefined &&
    parsed.data.duration > 0 &&
    parsed.data.seconds / parsed.data.duration >= WATCHED_THRESHOLD;

  try {
    const progress = {
      videoSecondsWatched: parsed.data.seconds,
      videoDuration: parsed.data.duration ?? null,
      videoWatched: video_watched,
    };
    // Owner-only: user_id comes from the session; the conflict target is
    // the (user_id, lesson_id) PK so only this user's row is updated.
    await db
      .insert(lessonProgress)
      .values({ userId: user.id, lessonId: lesson.id, ...progress })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: progress,
      });
  } catch (err) {
    const e = err as { cause?: { message?: string }; message?: string } | null;
    return {
      ok: false,
      error: e?.cause?.message ?? e?.message ?? "Database error",
      code: "DB_ERROR",
    };
  }

  // Only bust the dashboard cache on the transition that actually
  // changes what the learner sees there — no point revalidating on
  // every 10-second interval.
  if (video_watched) {
    revalidatePath("/dashboard");
  }

  return { ok: true, data: { video_watched } };
}
