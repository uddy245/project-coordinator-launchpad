"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

const KNOWN_ARTIFACTS = [
  "charter_brief",
  "project_plan",
  "raid_log",
  "status_report_w4",
  "status_report_w12",
  "change_request",
  "closeout_note",
] as const;

const CapstoneSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  title: z.string().trim().min(3).max(160),
  brief: z.string().trim().min(50).max(20000),
  required_artifacts: z.array(z.string().min(1)).min(1).max(20),
  estimated_hours: z.number().int().min(1).max(200).optional().nullable(),
  is_published: z.boolean(),
  rubric_summary: z.string().trim().max(8000).optional().nullable(),
});

export type AdminCapstoneInput = z.input<typeof CapstoneSchema>;

export const KNOWN_CAPSTONE_ARTIFACTS = KNOWN_ARTIFACTS;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in.", code: "UNAUTHENTICATED" as const };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false as const, error: "Not authorized.", code: "FORBIDDEN" as const };
  return { ok: true as const };
}

export async function upsertCapstone(
  input: AdminCapstoneInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = CapstoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const payload = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    brief: parsed.data.brief,
    required_artifacts: parsed.data.required_artifacts,
    estimated_hours: parsed.data.estimated_hours ?? null,
    is_published: parsed.data.is_published,
    rubric_summary: parsed.data.rubric_summary || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("capstone_scenarios")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug")
    .single();

  if (error) {
    return {
      ok: false,
      error: `Failed to save capstone: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/capstones");
  revalidatePath("/capstone");
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function deleteCapstone(
  capstoneId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!capstoneId) {
    return { ok: false, error: "Missing id.", code: "INVALID_INPUT" };
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { count } = await admin
    .from("capstone_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", capstoneId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${count} learner attempts exist. Unpublish instead.`,
      code: "CONFLICT",
    };
  }

  const { error } = await admin
    .from("capstone_scenarios")
    .delete()
    .eq("id", capstoneId);
  if (error) {
    return {
      ok: false,
      error: `Failed to delete: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/capstones");
  revalidatePath("/capstone");
  return { ok: true, data: { id: capstoneId } };
}
