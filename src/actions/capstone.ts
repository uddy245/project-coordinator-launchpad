"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { capstoneArtifacts, capstoneAttempts, capstoneScenarios } from "@/db/schema";
import { getAppUser, hasAccess } from "@/lib/auth/session";
import { createSignedUrl, removeObjects, uploadObject } from "@/lib/storage/object-storage";
import type { ActionResult } from "@/lib/types";

const ARTIFACT_BUCKET = "capstone-artifacts";
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024; // 25 MB

/** Postgres message from a Drizzle error (without the SQL text/params). */
function dbMessage(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string } | null;
  return e?.cause?.message ?? e?.message ?? "unknown";
}

type OwnedAttempt = { id: string; user_id: string; scenario_id: string; status: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadAttempt(attemptId: string): Promise<OwnedAttempt | null> {
  // A malformed id can't match a row (Postgres would reject the uuid cast).
  if (!UUID_RE.test(attemptId)) return null;
  const [row] = await db
    .select({
      id: capstoneAttempts.id,
      user_id: capstoneAttempts.userId,
      scenario_id: capstoneAttempts.scenarioId,
      status: capstoneAttempts.status,
    })
    .from(capstoneAttempts)
    .where(eq(capstoneAttempts.id, attemptId))
    .limit(1);
  return row ?? null;
}

export async function startCapstoneAttempt(
  scenarioSlug: string
): Promise<ActionResult<{ attemptId: string }>> {
  if (!scenarioSlug || typeof scenarioSlug !== "string") {
    return { ok: false, error: "Missing scenario.", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Sign in to start the capstone.", code: "UNAUTHENTICATED" };

  try {
    const [scenario] = await db
      .select({ id: capstoneScenarios.id, is_published: capstoneScenarios.isPublished })
      .from(capstoneScenarios)
      .where(eq(capstoneScenarios.slug, scenarioSlug))
      .limit(1);
    // capstone_scenarios: published AND has_access (hasAccess is true for admins).
    if (!scenario || !scenario.is_published || !(await hasAccess(user.id))) {
      return { ok: false, error: "Scenario not available.", code: "NOT_FOUND" };
    }

    // Reuse an in-progress attempt if one exists (owner-scoped).
    const [existing] = await db
      .select({ id: capstoneAttempts.id })
      .from(capstoneAttempts)
      .where(
        and(
          eq(capstoneAttempts.userId, user.id),
          eq(capstoneAttempts.scenarioId, scenario.id),
          eq(capstoneAttempts.status, "in_progress")
        )
      )
      .limit(1);
    if (existing) {
      return { ok: true, data: { attemptId: existing.id } };
    }

    let inserted: { id: string } | undefined;
    try {
      [inserted] = await db
        .insert(capstoneAttempts)
        .values({
          userId: user.id,
          scenarioId: scenario.id,
          status: "in_progress",
          startedAt: new Date().toISOString(),
        })
        .returning({ id: capstoneAttempts.id });
    } catch (err) {
      return {
        ok: false,
        error: `Failed to start capstone: ${dbMessage(err)}`,
        code: "DB_ERROR",
      };
    }
    if (!inserted) {
      return { ok: false, error: "Failed to start capstone: unknown", code: "DB_ERROR" };
    }

    revalidatePath(`/capstone/${scenarioSlug}`);
    revalidatePath("/capstone");
    return { ok: true, data: { attemptId: inserted.id } };
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
}

const ArtifactKindSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_]+$/, "Artifact kind must be snake_case");

export async function uploadCapstoneArtifact(
  formData: FormData
): Promise<ActionResult<{ id: string; file_url: string }>> {
  const attemptId = String(formData.get("attemptId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  const file = formData.get("file");

  if (!attemptId) {
    return { ok: false, error: "Missing attempt id.", code: "INVALID_INPUT" };
  }

  const kindResult = ArtifactKindSchema.safeParse(kindRaw);
  if (!kindResult.success) {
    return { ok: false, error: "Invalid artifact kind.", code: "INVALID_INPUT" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick a file to upload.", code: "INVALID_INPUT" };
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return { ok: false, error: "File exceeds 25 MB limit.", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Sign in to upload.", code: "UNAUTHENTICATED" };

  let attempt: OwnedAttempt | null;
  try {
    attempt = await loadAttempt(attemptId);
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
  if (!attempt) {
    return { ok: false, error: "Attempt not found.", code: "NOT_FOUND" };
  }
  if (attempt.user_id !== user.id) {
    return { ok: false, error: "Not your attempt.", code: "FORBIDDEN" };
  }
  if (attempt.status !== "in_progress") {
    return {
      ok: false,
      error: "Attempt is no longer editable.",
      code: "CONFLICT",
    };
  }

  const ext = file.name.match(/\.[a-zA-Z0-9]{1,5}$/)?.[0] ?? "";
  const objectPath = `${user.id}/${attemptId}/${kindResult.data}-${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await uploadObject(
    ARTIFACT_BUCKET,
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

  let row: { id: string; file_path: string } | undefined;
  try {
    // Replace any prior artifact of this kind on the same (owned) attempt.
    await db
      .delete(capstoneArtifacts)
      .where(
        and(
          eq(capstoneArtifacts.attemptId, attemptId),
          eq(capstoneArtifacts.userId, user.id),
          eq(capstoneArtifacts.kind, kindResult.data)
        )
      );

    [row] = await db
      .insert(capstoneArtifacts)
      .values({
        attemptId,
        userId: user.id,
        kind: kindResult.data,
        filePath: objectPath,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || null,
      })
      .returning({ id: capstoneArtifacts.id, file_path: capstoneArtifacts.filePath });
    if (!row) throw new Error("insert returned no row");
  } catch (err) {
    await removeObjects(ARTIFACT_BUCKET, [objectPath]);
    return {
      ok: false,
      error: `Failed to register artifact: ${dbMessage(err)}`,
      code: "DB_ERROR",
    };
  }

  // Signed URL for immediate preview/download by the owner — ownership of
  // the attempt (and so this artifact) was verified above.
  const signed = await createSignedUrl(ARTIFACT_BUCKET, row.file_path, 60 * 60); // 1 hour

  revalidatePath("/capstone");
  return {
    ok: true,
    data: { id: row.id, file_url: signed ?? "" },
  };
}

export async function submitCapstoneAttempt(
  attemptId: string
): Promise<ActionResult<{ status: string }>> {
  if (!attemptId) {
    return { ok: false, error: "Missing attempt id.", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Sign in.", code: "UNAUTHENTICATED" };

  let attempt: OwnedAttempt | null;
  try {
    attempt = await loadAttempt(attemptId);
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
  if (!attempt) {
    return { ok: false, error: "Attempt not found.", code: "NOT_FOUND" };
  }
  if (attempt.user_id !== user.id) {
    return { ok: false, error: "Not your attempt.", code: "FORBIDDEN" };
  }
  if (attempt.status !== "in_progress") {
    return { ok: false, error: "Already submitted.", code: "CONFLICT" };
  }

  let scenario: { required_artifacts: string[]; slug: string } | undefined;
  try {
    // Validate that all required artifacts are uploaded.
    [scenario] = await db
      .select({
        required_artifacts: capstoneScenarios.requiredArtifacts,
        slug: capstoneScenarios.slug,
      })
      .from(capstoneScenarios)
      .where(eq(capstoneScenarios.id, attempt.scenario_id))
      .limit(1);
    const required = scenario?.required_artifacts ?? [];

    const uploaded = await db
      .select({ kind: capstoneArtifacts.kind })
      .from(capstoneArtifacts)
      .where(
        and(eq(capstoneArtifacts.attemptId, attemptId), eq(capstoneArtifacts.userId, user.id))
      );
    const uploadedKinds = new Set(uploaded.map((r) => r.kind));
    const missing = required.filter((k) => !uploadedKinds.has(k));
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Missing artifacts: ${missing.map((k) => k.replace(/_/g, " ")).join(", ")}`,
        code: "INCOMPLETE",
      };
    }
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }

  try {
    await db
      .update(capstoneAttempts)
      .set({
        status: "submitted",
        submittedAt: new Date().toISOString(),
      })
      .where(and(eq(capstoneAttempts.id, attemptId), eq(capstoneAttempts.userId, user.id)));
  } catch (err) {
    return {
      ok: false,
      error: `Failed to submit: ${dbMessage(err)}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/capstone/${scenario?.slug}`);
  revalidatePath("/capstone");
  return { ok: true, data: { status: "submitted" } };
}
