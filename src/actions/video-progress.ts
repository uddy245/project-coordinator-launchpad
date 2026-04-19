"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("slug", parsed.data.lessonSlug)
    .eq("is_published", true)
    .maybeSingle();
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

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lesson.id,
      video_seconds_watched: parsed.data.seconds,
      video_duration: parsed.data.duration ?? null,
      video_watched,
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) {
    return { ok: false, error: error.message, code: "DB_ERROR" };
  }
  return { ok: true, data: { video_watched } };
}
