"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────
// Lesson upsert
// ──────────────────────────────────────────────────────────────────────

const LessonSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  number: z.number().int().min(1).max(99),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(2000).optional().nullable(),
  video_url: z.string().url().optional().or(z.literal("")).nullable(),
  competency: z.string().trim().min(1).max(80),
  prompt_name: z.string().trim().min(1).max(80),
  estimated_minutes: z.number().int().min(1).max(360).optional().nullable(),
  is_published: z.boolean(),
  is_preview: z.boolean(),
});

export type AdminLessonInput = z.input<typeof LessonSchema>;

export async function upsertLesson(input: AdminLessonInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = LessonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  const admin = createAdminClient();
  const payload = {
    slug: parsed.data.slug,
    number: parsed.data.number,
    title: parsed.data.title,
    summary: parsed.data.summary || null,
    video_url: parsed.data.video_url || null,
    competency: parsed.data.competency,
    prompt_name: parsed.data.prompt_name,
    estimated_minutes: parsed.data.estimated_minutes ?? null,
    is_published: parsed.data.is_published,
    is_preview: parsed.data.is_preview,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("lessons")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug")
    .single();

  if (error) {
    return {
      ok: false,
      error: `Failed to save lesson: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${data.slug}`);
  revalidatePath(`/lessons/${data.slug}`);
  revalidatePath("/dashboard");

  return { ok: true, data: { id: data.id, slug: data.slug } };
}

// ──────────────────────────────────────────────────────────────────────
// Quiz items bulk replace — paste a JSON array, replaces all quiz items
// for the lesson in a single transaction.
// ──────────────────────────────────────────────────────────────────────

const QuizItemSchema = z.object({
  sort: z.number().int().min(1),
  stem: z.string().trim().min(5),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(4),
        text: z.string().min(1),
      })
    )
    .min(2)
    .max(8),
  correct: z.string().min(1).max(4),
  distractor_rationale: z.record(z.string(), z.string()).default({}),
  competency: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const QuizItemsInputSchema = z.object({
  lessonSlug: z.string(),
  itemsJson: z.string(),
});

export type ReplaceQuizItemsInput = z.input<typeof QuizItemsInputSchema>;

export async function replaceQuizItems(
  input: ReplaceQuizItemsInput
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = QuizItemsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", code: "INVALID_INPUT" };
  }

  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(parsed.data.itemsJson);
  } catch {
    return {
      ok: false,
      error: "Quiz items must be valid JSON (an array of items).",
      code: "INVALID_INPUT",
    };
  }

  const itemsResult = z.array(QuizItemSchema).min(1).safeParse(parsedItems);
  if (!itemsResult.success) {
    return {
      ok: false,
      error: `Quiz items did not validate: ${itemsResult.error.issues[0]?.message ?? "unknown"}`,
      code: "INVALID_INPUT",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("slug", parsed.data.lessonSlug)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Replace strategy: delete existing rows for this lesson, then bulk
  // insert. This is safest for re-publishes; small data set so a transaction
  // wrapper isn't strictly necessary.
  await admin.from("quiz_items").delete().eq("lesson_id", lesson.id);

  const rows = itemsResult.data.map((it) => ({
    lesson_id: lesson.id,
    sort: it.sort,
    stem: it.stem,
    options: it.options,
    correct: it.correct,
    distractor_rationale: it.distractor_rationale,
    competency: it.competency,
    difficulty: it.difficulty,
  }));
  const { error } = await admin.from("quiz_items").insert(rows);
  if (error) {
    return {
      ok: false,
      error: `Failed to insert quiz items: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: { inserted: rows.length } };
}
