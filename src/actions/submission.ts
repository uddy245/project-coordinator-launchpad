"use server";

import { z } from "zod";
import { env } from "@/env";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, submissions } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import { canViewLesson } from "@/lib/lessons/access";
import { uploadObject } from "@/lib/storage/r2";
import { extractText, SUPPORTED_MIME_TYPES } from "@/lib/grading/parsers";
import { gradeSubmission } from "@/lib/grading/service";
import { MAX_UPLOAD_BYTES } from "@/lib/submission/constants";
import type { ActionResult } from "@/lib/types";

const CreateSchema = z.object({
  lessonSlug: z.string().min(1),
  filename: z.string().min(1).max(200),
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
  fileBase64: z.string().min(1),
});

/** Postgres message from a Drizzle error (without the SQL text/params). */
function dbMessage(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string } | null;
  return e?.cause?.message ?? e?.message ?? "Insert failed";
}

export type CreateSubmissionInput = z.input<typeof CreateSchema>;

export async function createSubmission(
  input: CreateSubmissionInput
): Promise<ActionResult<{ submissionId: string }>> {
  try {
    return await createSubmissionImpl(input);
  } catch (err) {
    console.error("[createSubmission] unhandled error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message, code: "UNEXPECTED_ERROR" };
  }
}

async function createSubmissionImpl(
  input: CreateSubmissionInput
): Promise<ActionResult<{ submissionId: string }>> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const user = await getAppUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  const buffer = Buffer.from(parsed.data.fileBase64, "base64");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`,
      code: "FILE_TOO_LARGE",
    };
  }

  let lesson: { id: string } | null = null;
  try {
    const [row] = await db
      .select({ id: lessons.id, isPublished: lessons.isPublished, isPreview: lessons.isPreview })
      .from(lessons)
      .where(eq(lessons.slug, parsed.data.lessonSlug))
      .limit(1);
    // lessons (was RLS): free previews for anyone, else has_access; admins all.
    if (row && (await canViewLesson(user.id, row))) lesson = row;
  } catch {
    lesson = null;
  }
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Insert the pending submission row first so we have an id to key the
  // storage path by. user_id is bound to the session, never taken from input.
  const ext = extFor(parsed.data.mimeType);
  const placeholderPath = "pending";

  let sub: { id: string } | undefined;
  try {
    [sub] = await db
      .insert(submissions)
      .values({
        userId: user.id,
        lessonId: lesson.id,
        storagePath: placeholderPath,
        originalFilename: parsed.data.filename,
        mimeType: parsed.data.mimeType,
        sizeBytes: buffer.length,
        status: "pending",
      })
      .returning({ id: submissions.id });
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
  if (!sub) {
    return { ok: false, error: "Insert failed", code: "DB_ERROR" };
  }
  const ownSubmission = and(eq(submissions.id, sub.id), eq(submissions.userId, user.id));

  const storagePath = `${user.id}/${sub.id}.${ext}`;
  const { error: uploadErr } = await uploadObject(
    "submissions",
    storagePath,
    buffer,
    parsed.data.mimeType
  );
  if (uploadErr) {
    // Clean up the orphaned row so retries are clean.
    await db
      .delete(submissions)
      .where(ownSubmission)
      .catch((e: unknown) => console.error("[createSubmission] orphan cleanup failed", e));
    return {
      ok: false,
      error: `Upload failed: ${uploadErr.message}`,
      code: "STORAGE_ERROR",
    };
  }

  // Extract text synchronously — parsing is fast (<1s for MVP sizes)
  // and doing it here lets the grading route skip a storage round-trip.
  const extracted = await extractText(parsed.data.mimeType, buffer);
  if (!extracted.ok) {
    await db
      .update(submissions)
      .set({ status: "grading_failed", gradedAt: new Date().toISOString() })
      .where(ownSubmission)
      .catch((e: unknown) => console.error("[createSubmission] status update failed", e));
    return extracted;
  }

  // Old code didn't check this write; keep that (log only).
  await db
    .update(submissions)
    .set({
      storagePath,
      extractedText: extracted.data.text,
    })
    .where(ownSubmission)
    .catch((e: unknown) => console.error("[createSubmission] storage_path update failed", e));

  // Fire-and-forget the grading worker. We call our own /api/grade/[id]
  // route over HTTP with a shared secret; that route runs gradeSubmission
  // asynchronously so this action can return immediately and the client
  // can redirect to /submissions/[id] where the poller waits for the
  // graded state. If the fetch itself throws (network hiccup), we fall
  // back to inline grading so the submission doesn't rot in pending.
  const workerUrl = `${env.NEXT_PUBLIC_APP_URL}/api/grade/${sub.id}`;
  try {
    // No await — fire the request and let Next.js serverless pick it up.
    // Include a catch handler so an unhandled rejection doesn't crash.
    void fetch(workerUrl, {
      method: "POST",
      headers: { "x-grade-worker-secret": env.GRADE_WORKER_SECRET },
      cache: "no-store",
    }).catch((err) => {
      console.error("[createSubmission] worker fetch failed", err);
    });
  } catch (err) {
    console.error("[createSubmission] worker dispatch failed", err);
    // Inline fallback so the submission still gets graded.
    gradeSubmission(sub.id).catch((e) =>
      console.error("[createSubmission] inline fallback failed", e)
    );
  }

  return { ok: true, data: { submissionId: sub.id } };
}

function extFor(mime: string): string {
  switch (mime) {
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/pdf":
      return "pdf";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    default:
      return "bin";
  }
}
