"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { gradeMockInterviewResponse } from "@/lib/grading/mock-interview";

const SubmitSchema = z.object({
  scenarioId: z.string().uuid(),
  responseText: z
    .string()
    .trim()
    .min(80, "A 80-character minimum keeps Claude's grade meaningful")
    .max(8000),
});

export type SubmitMockInterviewInput = z.input<typeof SubmitSchema>;

/**
 * Submit (or resubmit) a mock-interview response. Inserts/updates the
 * row, kicks the grader inline, and returns the response id.
 *
 * Grading is awaited synchronously: mock interviews are short, the
 * Claude call returns in a few seconds, and skipping a worker route
 * keeps the surface area small for this MVP.
 */
export async function submitMockInterview(input: SubmitMockInterviewInput): Promise<
  ActionResult<{
    responseId: string;
    status: "graded" | "grading_failed";
    overallScore: number;
    pass: boolean;
    feedbackSummary: string;
    responseText: string;
  }>
> {
  const parsed = SubmitSchema.safeParse(input);
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

  const admin = createAdminClient();

  const { data: scenario } = await admin
    .from("mock_interview_scenarios")
    .select("id, prompt, competency")
    .eq("id", parsed.data.scenarioId)
    .eq("is_published", true)
    .maybeSingle();
  if (!scenario) {
    return { ok: false, error: "Scenario not found.", code: "NOT_FOUND" };
  }

  // Mark the row as in-flight so the UI can show "grading…" if the user
  // navigates away and back. We deliberately clear the score fields here so
  // the previous grade can't be confused with the new one — the grader's
  // result will fill them in below. This is a single upsert (insert-or-replace)
  // keyed on the (user_id, scenario_id) unique constraint.
  const nowIso = new Date().toISOString();
  const { data: row, error: upsertErr } = await admin
    .from("mock_interview_responses")
    .upsert(
      {
        user_id: user.id,
        scenario_id: scenario.id,
        response_text: parsed.data.responseText,
        status: "grading",
        overall_score: null,
        pass: null,
        feedback_summary: null,
        graded_at: null,
        updated_at: nowIso,
      },
      { onConflict: "user_id,scenario_id" }
    )
    .select("id")
    .single();
  if (upsertErr || !row) {
    return {
      ok: false,
      error: `Failed to save response: ${upsertErr?.message ?? "unknown"}`,
      code: "DB_ERROR",
    };
  }

  try {
    const result = await gradeMockInterviewResponse({
      prompt: scenario.prompt,
      response: parsed.data.responseText,
      competency: scenario.competency,
    });

    // Persist the grade. Crucially, we ALSO re-write response_text here so
    // the row's text and grade are guaranteed to be in sync — if the upsert
    // above quietly didn't update response_text for any reason (PostgREST
    // upsert quirks, default-to-null behaviour), this final update fixes it.
    // Error-checked so silent DB failures don't leave the UI showing a stale
    // grade.
    const { error: updateErr } = await admin
      .from("mock_interview_responses")
      .update({
        response_text: parsed.data.responseText,
        status: "graded",
        overall_score: result.overallScore,
        pass: result.pass,
        feedback_summary: result.feedbackSummary,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updateErr) {
      return {
        ok: false,
        error: `Failed to save grade: ${updateErr.message}`,
        code: "DB_ERROR",
      };
    }

    revalidatePath("/interviews");
    revalidatePath(`/interviews/${scenario.id}`);
    return {
      ok: true,
      data: {
        responseId: row.id,
        status: "graded",
        overallScore: result.overallScore,
        pass: result.pass,
        feedbackSummary: result.feedbackSummary,
        responseText: parsed.data.responseText,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    await admin
      .from("mock_interview_responses")
      .update({
        status: "grading_failed",
        feedback_summary: `Grading failed: ${msg}`,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    revalidatePath(`/interviews/${scenario.id}`);
    return { ok: false, error: msg, code: "GRADING_FAILED" };
  }
}
