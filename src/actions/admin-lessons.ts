"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, lessonTemplates, quizItems } from "@/db/schema";
import { getAppUser, isAdmin } from "@/lib/auth/session";
import { publicUrl, removeObjects, uploadObject } from "@/lib/storage/r2";
import type { ActionResult } from "@/lib/types";
import { QuizItemSchema } from "@/lib/quiz/schema";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Admin gate shared by every action in this file. The database has no RLS,
 * so this check is the only thing standing between a caller and the writes.
 */
async function requireAdmin() {
  const user = await getAppUser().catch(() => null);
  if (!user)
    return { ok: false as const, error: "Not signed in.", code: "UNAUTHENTICATED" as const };
  // Fail closed: a lookup error is treated as "not an admin".
  const admin = await isAdmin(user.id).catch(() => false);
  if (!admin) return { ok: false as const, error: "Not authorized.", code: "FORBIDDEN" as const };
  return { ok: true as const };
}

async function findLessonIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

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

export async function upsertLesson(
  input: AdminLessonInput
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = LessonSchema.safeParse(input);
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
    number: parsed.data.number,
    title: parsed.data.title,
    summary: parsed.data.summary || null,
    videoUrl: parsed.data.video_url || null,
    competency: parsed.data.competency,
    promptName: parsed.data.prompt_name,
    estimatedMinutes: parsed.data.estimated_minutes ?? null,
    isPublished: parsed.data.is_published,
    isPreview: parsed.data.is_preview,
    updatedAt: new Date().toISOString(),
  };

  let data: { id: string; slug: string } | undefined;
  try {
    [data] = await db
      .insert(lessons)
      .values(payload)
      .onConflictDoUpdate({
        target: lessons.slug,
        set: {
          number: payload.number,
          title: payload.title,
          summary: payload.summary,
          videoUrl: payload.videoUrl,
          competency: payload.competency,
          promptName: payload.promptName,
          estimatedMinutes: payload.estimatedMinutes,
          isPublished: payload.isPublished,
          isPreview: payload.isPreview,
          updatedAt: payload.updatedAt,
        },
      })
      .returning({ id: lessons.id, slug: lessons.slug });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save lesson: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }
  if (!data) {
    return { ok: false, error: "Failed to save lesson: no row returned", code: "DB_ERROR" };
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

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  let lessonId: string | null;
  try {
    lessonId = await findLessonIdBySlug(parsed.data.lessonSlug);
  } catch (err) {
    return { ok: false, error: `Failed to load lesson: ${errMsg(err)}`, code: "DB_ERROR" };
  }
  if (!lessonId) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Replace strategy: delete existing rows for this lesson, then bulk
  // insert, in one transaction so a failed insert doesn't leave the
  // lesson with no quiz items.
  const rows = itemsResult.data.map((it) => ({
    lessonId: lessonId,
    sort: it.sort,
    stem: it.stem,
    options: it.options,
    correct: it.correct,
    distractorRationale: it.distractor_rationale,
    competency: it.competency,
    difficulty: it.difficulty,
  }));
  try {
    await db.transaction(async (tx) => {
      await tx.delete(quizItems).where(eq(quizItems.lessonId, lessonId));
      await tx.insert(quizItems).values(rows);
    });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to insert quiz items: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: { inserted: rows.length } };
}

// ──────────────────────────────────────────────────────────────────────
// Lesson templates — upload an XLSX/PDF/CSV to R2 storage and
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
  formData: FormData
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

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  let lessonId: string | null;
  try {
    lessonId = await findLessonIdBySlug(parsed.data.lessonSlug);
  } catch (err) {
    return { ok: false, error: `Failed to load lesson: ${errMsg(err)}`, code: "DB_ERROR" };
  }
  if (!lessonId) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Object path: <lesson_slug>/<timestamp>-<safe-name>.ext
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${parsed.data.lessonSlug}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await uploadObject(
    TEMPLATE_BUCKET,
    objectPath,
    buffer,
    file.type || "application/octet-stream"
  );
  if (uploadErr) {
    return {
      ok: false,
      error: `Storage upload failed: ${uploadErr.message}`,
      code: "STORAGE_ERROR",
    };
  }

  const fileUrl = publicUrl(TEMPLATE_BUCKET, objectPath);

  let row: { id: string } | undefined;
  try {
    [row] = await db
      .insert(lessonTemplates)
      .values({
        lessonId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        kind: parsed.data.kind,
        fileUrl,
        sort: parsed.data.sort ?? 100,
      })
      .returning({ id: lessonTemplates.id });
    if (!row) throw new Error("no row returned");
  } catch (err) {
    // Best-effort cleanup of the orphaned file (removeObjects never throws).
    await removeObjects(TEMPLATE_BUCKET, [objectPath]);
    return {
      ok: false,
      error: `Failed to register template: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  revalidatePath(`/admin/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: { id: row.id, file_url: fileUrl } };
}

export async function deleteLessonTemplate(
  templateId: string
): Promise<ActionResult<{ id: string }>> {
  if (!templateId) {
    return { ok: false, error: "Missing template id.", code: "INVALID_INPUT" };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  let row: { id: string; file_url: string; lesson_id: string } | undefined;
  try {
    [row] = await db
      .select({
        id: lessonTemplates.id,
        file_url: lessonTemplates.fileUrl,
        lesson_id: lessonTemplates.lessonId,
      })
      .from(lessonTemplates)
      .where(eq(lessonTemplates.id, templateId))
      .limit(1);
  } catch (err) {
    return { ok: false, error: `Failed to load template: ${errMsg(err)}`, code: "DB_ERROR" };
  }
  if (!row) return { ok: false, error: "Template not found.", code: "NOT_FOUND" };

  try {
    await db.delete(lessonTemplates).where(eq(lessonTemplates.id, templateId));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to delete: ${errMsg(err)}`,
      code: "DB_ERROR",
    };
  }

  // Best-effort delete of the underlying object. Handles both the current
  // `/api/files/lesson-templates/<path>` URLs and legacy Supabase Storage
  // URLs (objects were migrated to R2 under the same path).
  try {
    const url = new URL(row.file_url);
    const prefixes = [
      `/api/files/${TEMPLATE_BUCKET}/`,
      `/storage/v1/object/public/${TEMPLATE_BUCKET}/`,
    ];
    for (const pathPrefix of prefixes) {
      const idx = url.pathname.indexOf(pathPrefix);
      if (idx >= 0) {
        const objectPath = decodeURIComponent(url.pathname.slice(idx + pathPrefix.length));
        await removeObjects(TEMPLATE_BUCKET, [objectPath]);
        break;
      }
    }
  } catch {
    /* swallow — orphaned blob is acceptable */
  }

  revalidatePath("/admin/lessons");
  return { ok: true, data: { id: templateId } };
}

// ──────────────────────────────────────────────────────────────────────
// Lesson video upload — push an MP4 to the lesson-videos bucket and
// return the public URL. The form pastes that URL into video_url and
// saves the lesson row separately. We don't auto-set video_url here so
// the admin can decide whether to publish the new file or just stage it.
// ──────────────────────────────────────────────────────────────────────

const VIDEO_BUCKET = "lesson-videos";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB — Bunny etc. handle the big-streaming case
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const VideoUploadInputSchema = z.object({
  lessonSlug: z.string().min(1),
});

export async function uploadLessonVideo(
  formData: FormData
): Promise<ActionResult<{ url: string; objectPath: string }>> {
  const parsed = VideoUploadInputSchema.safeParse({
    lessonSlug: formData.get("lessonSlug"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick a video file to upload.", code: "INVALID_INPUT" };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      error: `File exceeds ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit. Use a streaming host (Bunny / Mux) for larger files.`,
      code: "INVALID_INPUT",
    };
  }
  if (file.type && !ALLOWED_VIDEO_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type: ${file.type}. Use MP4 / MOV / WebM.`,
      code: "INVALID_INPUT",
    };
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  let lessonId: string | null;
  try {
    lessonId = await findLessonIdBySlug(parsed.data.lessonSlug);
  } catch (err) {
    return { ok: false, error: `Failed to load lesson: ${errMsg(err)}`, code: "DB_ERROR" };
  }
  if (!lessonId) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Object path: <lesson_slug>/<timestamp>-<safe-name>.ext. Timestamp
  // prefix means re-uploads don't clobber and we can roll back by
  // pasting the previous URL back into video_url if needed.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${parsed.data.lessonSlug}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await uploadObject(
    VIDEO_BUCKET,
    objectPath,
    buffer,
    file.type || "video/mp4"
  );
  if (uploadErr) {
    return {
      ok: false,
      error: `Storage upload failed: ${uploadErr.message}`,
      code: "STORAGE_ERROR",
    };
  }

  const url = publicUrl(VIDEO_BUCKET, objectPath);

  // Don't write video_url here — the form's submit path saves the URL
  // along with all other lesson fields atomically. Returning the URL
  // lets the client paste it into the field and confirm before save.
  revalidatePath(`/admin/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: { url, objectPath } };
}
