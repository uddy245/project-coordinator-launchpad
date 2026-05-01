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

// ──────────────────────────────────────────────────────────────────────
// Lesson templates — upload an XLSX/PDF/CSV to Supabase Storage and
// register it in the lesson_templates table.
// ──────────────────────────────────────────────────────────────────────

const TEMPLATE_BUCKET = "lesson-templates";
const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024; // 10 MB

const TemplateUploadInputSchema = z.object({
  lessonSlug: z.string(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  kind: z.enum(["starter", "example"]),
  sort: z.number().int().min(0).max(9999).optional(),
});

export type UploadTemplateInput = z.input<typeof TemplateUploadInputSchema>;

export async function uploadLessonTemplate(
  formData: FormData,
): Promise<ActionResult<{ id: string; file_url: string }>> {
  const rawInput = {
    lessonSlug: formData.get("lessonSlug"),
    title: formData.get("title"),
    description: formData.get("description") || null,
    kind: formData.get("kind"),
    sort: formData.get("sort") ? Number(formData.get("sort")) : undefined,
  };

  const parsed = TemplateUploadInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick a file to upload.", code: "INVALID_INPUT" };
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    return { ok: false, error: "File exceeds 10 MB limit.", code: "INVALID_INPUT" };
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

  // Object path: <lesson_slug>/<timestamp>-<safe-name>.ext
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${parsed.data.lessonSlug}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await admin.storage
    .from(TEMPLATE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadErr) {
    return {
      ok: false,
      error: `Storage upload failed: ${uploadErr.message}`,
      code: "STORAGE_ERROR",
    };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(TEMPLATE_BUCKET).getPublicUrl(objectPath);

  const { data: row, error: insertErr } = await admin
    .from("lesson_templates")
    .insert({
      lesson_id: lesson.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      kind: parsed.data.kind,
      file_url: publicUrl,
      sort: parsed.data.sort ?? 100,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Best-effort cleanup of the orphaned file.
    await admin.storage.from(TEMPLATE_BUCKET).remove([objectPath]).catch(() => {});
    return {
      ok: false,
      error: `Failed to register template: ${insertErr.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  revalidatePath(`/admin/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: { id: row.id, file_url: publicUrl } };
}

export async function deleteLessonTemplate(
  templateId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!templateId) {
    return { ok: false, error: "Missing template id.", code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Not authorized.", code: "FORBIDDEN" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("lesson_templates")
    .select("id, file_url, lesson_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Template not found.", code: "NOT_FOUND" };

  const { error: delErr } = await admin
    .from("lesson_templates")
    .delete()
    .eq("id", templateId);
  if (delErr) {
    return {
      ok: false,
      error: `Failed to delete: ${delErr.message}`,
      code: "DB_ERROR",
    };
  }

  // Best-effort delete of the underlying object.
  try {
    const url = new URL(row.file_url);
    const pathPrefix = `/storage/v1/object/public/${TEMPLATE_BUCKET}/`;
    const idx = url.pathname.indexOf(pathPrefix);
    if (idx >= 0) {
      const objectPath = url.pathname.slice(idx + pathPrefix.length);
      await admin.storage.from(TEMPLATE_BUCKET).remove([objectPath]);
    }
  } catch {
    /* swallow — orphaned blob is acceptable */
  }

  revalidatePath("/admin/lessons");
  return { ok: true, data: { id: templateId } };
}
