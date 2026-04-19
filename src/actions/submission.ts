"use server";

import { after } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, SUPPORTED_MIME_TYPES } from "@/lib/grading/parsers";
import { gradeSubmission } from "@/lib/grading/service";
import type { ActionResult } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const CreateSchema = z.object({
  lessonSlug: z.string().min(1),
  filename: z.string().min(1).max(200),
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
  fileBase64: z.string().min(1),
});

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("slug", parsed.data.lessonSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Insert the pending submission row first so we have an id to key the
  // storage path by. Service role writes here because the grading path
  // later will need to mutate this row.
  const admin = createAdminClient();
  const ext = extFor(parsed.data.mimeType);
  const placeholderPath = "pending";

  const { data: sub, error: insertErr } = await admin
    .from("submissions")
    .insert({
      user_id: user.id,
      lesson_id: lesson.id,
      storage_path: placeholderPath,
      original_filename: parsed.data.filename,
      mime_type: parsed.data.mimeType,
      size_bytes: buffer.length,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertErr || !sub) {
    return {
      ok: false,
      error: insertErr?.message ?? "Insert failed",
      code: "DB_ERROR",
    };
  }

  const storagePath = `${user.id}/${sub.id}.${ext}`;
  const { error: uploadErr } = await admin.storage.from("submissions").upload(storagePath, buffer, {
    contentType: parsed.data.mimeType,
    upsert: false,
  });
  if (uploadErr) {
    // Clean up the orphaned row so retries are clean.
    await admin.from("submissions").delete().eq("id", sub.id);
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
    await admin
      .from("submissions")
      .update({ status: "grading_failed", graded_at: new Date().toISOString() })
      .eq("id", sub.id);
    return extracted;
  }

  await admin
    .from("submissions")
    .update({
      storage_path: storagePath,
      extracted_text: extracted.data.text,
    })
    .eq("id", sub.id);

  // Fire the grading call without awaiting — Next.js keeps the request
  // alive via `after()` so the caller returns immediately. The grading
  // path idempotently guards against double-runs.
  after(async () => {
    try {
      await gradeSubmission(sub.id);
    } catch (err) {
      console.error("grading failed in after()", err);
    }
  });

  // Best-effort daily cost cap guard — if today's spend is already past
  // the cap, park the submission in manual_review instead of grading.
  // MVP: logs-only estimate using sum of output_tokens×price-per-token.
  // Full cap enforcement lives in a future ticket; this is the stub.
  void env.ANTHROPIC_SPEND_CAP_USD;

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
