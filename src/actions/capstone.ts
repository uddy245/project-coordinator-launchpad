"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const ARTIFACT_BUCKET = "capstone-artifacts";
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024; // 25 MB

export async function startCapstoneAttempt(
  scenarioSlug: string,
): Promise<ActionResult<{ attemptId: string }>> {
  if (!scenarioSlug || typeof scenarioSlug !== "string") {
    return { ok: false, error: "Missing scenario.", code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to start the capstone.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: scenario } = await admin
    .from("capstone_scenarios")
    .select("id, is_published")
    .eq("slug", scenarioSlug)
    .maybeSingle();
  if (!scenario || !scenario.is_published) {
    return { ok: false, error: "Scenario not available.", code: "NOT_FOUND" };
  }

  // Reuse an in-progress attempt if one exists.
  const { data: existing } = await admin
    .from("capstone_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("scenario_id", scenario.id)
    .in("status", ["in_progress"])
    .maybeSingle();
  if (existing) {
    return { ok: true, data: { attemptId: existing.id } };
  }

  const { data, error } = await admin
    .from("capstone_attempts")
    .insert({
      user_id: user.id,
      scenario_id: scenario.id,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: `Failed to start capstone: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/capstone/${scenarioSlug}`);
  revalidatePath("/capstone");
  return { ok: true, data: { attemptId: data.id } };
}

const ArtifactKindSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_]+$/, "Artifact kind must be snake_case");

export async function uploadCapstoneArtifact(
  formData: FormData,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to upload.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("capstone_attempts")
    .select("id, user_id, scenario_id, status")
    .eq("id", attemptId)
    .maybeSingle();
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

  const { error: uploadErr } = await admin.storage
    .from(ARTIFACT_BUCKET)
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

  // Replace any prior artifact of this kind on the same attempt.
  await admin
    .from("capstone_artifacts")
    .delete()
    .eq("attempt_id", attemptId)
    .eq("kind", kindResult.data);

  const { data: row, error: insertErr } = await admin
    .from("capstone_artifacts")
    .insert({
      attempt_id: attemptId,
      user_id: user.id,
      kind: kindResult.data,
      file_path: objectPath,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || null,
    })
    .select("id, file_path")
    .single();

  if (insertErr) {
    await admin.storage.from(ARTIFACT_BUCKET).remove([objectPath]).catch(() => {});
    return {
      ok: false,
      error: `Failed to register artifact: ${insertErr.message}`,
      code: "DB_ERROR",
    };
  }

  // Signed URL for immediate preview/download by the owner.
  const { data: signed } = await admin.storage
    .from(ARTIFACT_BUCKET)
    .createSignedUrl(row.file_path, 60 * 60); // 1 hour

  revalidatePath("/capstone");
  return {
    ok: true,
    data: { id: row.id, file_url: signed?.signedUrl ?? "" },
  };
}

export async function submitCapstoneAttempt(
  attemptId: string,
): Promise<ActionResult<{ status: string }>> {
  if (!attemptId) {
    return { ok: false, error: "Missing attempt id.", code: "INVALID_INPUT" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("capstone_attempts")
    .select("id, user_id, scenario_id, status")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) {
    return { ok: false, error: "Attempt not found.", code: "NOT_FOUND" };
  }
  if (attempt.user_id !== user.id) {
    return { ok: false, error: "Not your attempt.", code: "FORBIDDEN" };
  }
  if (attempt.status !== "in_progress") {
    return { ok: false, error: "Already submitted.", code: "CONFLICT" };
  }

  // Validate that all required artifacts are uploaded.
  const { data: scenario } = await admin
    .from("capstone_scenarios")
    .select("required_artifacts, slug")
    .eq("id", attempt.scenario_id)
    .single();
  const required = (scenario?.required_artifacts ?? []) as string[];

  const { data: uploaded } = await admin
    .from("capstone_artifacts")
    .select("kind")
    .eq("attempt_id", attemptId);
  const uploadedKinds = new Set((uploaded ?? []).map((r) => r.kind as string));
  const missing = required.filter((k) => !uploadedKinds.has(k));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing artifacts: ${missing.map((k) => k.replace(/_/g, " ")).join(", ")}`,
      code: "INCOMPLETE",
    };
  }

  const { error } = await admin
    .from("capstone_attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    return {
      ok: false,
      error: `Failed to submit: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath(`/capstone/${scenario?.slug}`);
  revalidatePath("/capstone");
  return { ok: true, data: { status: "submitted" } };
}
