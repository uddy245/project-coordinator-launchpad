"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mockInterviewResponses, mockInterviewScenarios } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
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

/** Postgres message from a Drizzle error (without the SQL text/params). */
function dbMessage(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string } | null;
  return e?.cause?.message ?? e?.message ?? "unknown";
}

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

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  let scenario: { id: string; prompt: string; competency: string } | undefined;
  try {
    // mock_interview_scenarios: published, any signed-in user.
    [scenario] = await db
      .select({
        id: mockInterviewScenarios.id,
        prompt: mockInterviewScenarios.prompt,
        competency: mockInterviewScenarios.competency,
      })
      .from(mockInterviewScenarios)
      .where(
        and(
          eq(mockInterviewScenarios.id, parsed.data.scenarioId),
          eq(mockInterviewScenarios.isPublished, true)
        )
      )
      .limit(1);
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
  if (!scenario) {
    return { ok: false, error: "Scenario not found.", code: "NOT_FOUND" };
  }

  // Mark the row as in-flight so the UI can show "grading…" if the user
  // navigates away and back. We deliberately clear the score fields here so
  // the previous grade can't be confused with the new one — the grader's
  // result will fill them in below. This is a single upsert (insert-or-replace)
  // keyed on the (user_id, scenario_id) unique constraint.
  const nowIso = new Date().toISOString();
  let row: { id: string } | undefined;
  try {
    const inflight = {
      responseText: parsed.data.responseText,
      status: "grading",
      overallScore: null,
      pass: null,
      feedbackSummary: null,
      gradedAt: null,
      updatedAt: nowIso,
    };
    // user_id comes from the session, never from input.
    [row] = await db
      .insert(mockInterviewResponses)
      .values({ userId: user.id, scenarioId: scenario.id, ...inflight })
      .onConflictDoUpdate({
        target: [mockInterviewResponses.userId, mockInterviewResponses.scenarioId],
        set: inflight,
      })
      .returning({ id: mockInterviewResponses.id });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to save response: ${dbMessage(err)}`,
      code: "DB_ERROR",
    };
  }
  if (!row) {
    return { ok: false, error: "Failed to save response: unknown", code: "DB_ERROR" };
  }
  const responseId = row.id;
  const ownRow = and(
    eq(mockInterviewResponses.id, responseId),
    eq(mockInterviewResponses.userId, user.id)
  );

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
    try {
      await db
        .update(mockInterviewResponses)
        .set({
          responseText: parsed.data.responseText,
          status: "graded",
          overallScore: result.overallScore,
          pass: result.pass,
          feedbackSummary: result.feedbackSummary,
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(ownRow);
    } catch (updateErr) {
      return {
        ok: false,
        error: `Failed to save grade: ${dbMessage(updateErr)}`,
        code: "DB_ERROR",
      };
    }

    revalidatePath("/interviews");
    revalidatePath(`/interviews/${scenario.id}`);
    return {
      ok: true,
      data: {
        responseId,
        status: "graded",
        overallScore: result.overallScore,
        pass: result.pass,
        feedbackSummary: result.feedbackSummary,
        responseText: parsed.data.responseText,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    try {
      await db
        .update(mockInterviewResponses)
        .set({
          status: "grading_failed",
          feedbackSummary: `Grading failed: ${msg}`,
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(ownRow);
    } catch (e) {
      console.error("[submitMockInterview] failed to record grading failure", e);
    }
    revalidatePath(`/interviews/${scenario.id}`);
    return { ok: false, error: msg, code: "GRADING_FAILED" };
  }
}
