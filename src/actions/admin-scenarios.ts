"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScenarioSchema } from "@/lib/interviews/schema";
import type { ActionResult } from "@/lib/types";

export type AdminScenarioInput = z.input<typeof ScenarioSchema>;

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

export async function upsertScenario(
  input: AdminScenarioInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = ScenarioSchema.safeParse(input);
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
    prompt: parsed.data.prompt,
    category: parsed.data.category,
    difficulty: parsed.data.difficulty,
    competency: parsed.data.competency,
    sort: parsed.data.sort,
    is_published: parsed.data.is_published,
    rubric_summary: parsed.data.rubric_summary || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("mock_interview_scenarios")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug")
    .single();

  if (error) {
    return {
      ok: false,
      error: `Failed to save scenario: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/scenarios");
  revalidatePath("/interviews");
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function deleteScenario(
  scenarioId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!scenarioId) {
    return { ok: false, error: "Missing id.", code: "INVALID_INPUT" };
  }
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  // Hard refusal if there are graded responses; caller should unpublish instead.
  const { count } = await admin
    .from("mock_interview_responses")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${count} learner responses exist. Unpublish instead.`,
      code: "CONFLICT",
    };
  }

  const { error } = await admin
    .from("mock_interview_scenarios")
    .delete()
    .eq("id", scenarioId);
  if (error) {
    return {
      ok: false,
      error: `Failed to delete: ${error.message}`,
      code: "DB_ERROR",
    };
  }

  revalidatePath("/admin/scenarios");
  revalidatePath("/interviews");
  return { ok: true, data: { id: scenarioId } };
}
