/**
 * Mock-interview grader. Smaller, simpler, and synchronous-ish compared
 * to the rubric grader in service.ts:
 *
 *   - Single dimension (the scenario's competency)
 *   - Plain JSON output, not tool-use (response is short enough that a
 *     malformed JSON re-prompt rarely needed)
 *   - Returns overall score, pass flag, and a 1–3 sentence feedback summary
 *
 * Reuses anthropic client + spend cap from the existing grading stack.
 */

import { anthropic, GRADING_MODEL } from "@/lib/anthropic/client";
import { checkSpendCap } from "@/lib/grading/spend-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export type GradeMockInterviewArgs = {
  prompt: string;
  response: string;
  competency: string;
};

export type GradeMockInterviewResult = {
  overallScore: number;
  pass: boolean;
  feedbackSummary: string;
};

const Output = z.object({
  overall_score: z.number().min(1).max(5),
  pass: z.boolean(),
  feedback_summary: z.string().min(20).max(800),
});

const SYSTEM_PROMPT = `You are an experienced project manager grading a coordinator's response to a mock-interview question. The candidate is interviewing for a coordinator role.

You score the response on a single overall dimension that captures professional judgment, clarity, and procedural soundness — keep the bar high but fair for an early-career professional.

Use this scale:
  5 — Excellent. Specific, professional, demonstrates judgment and self-awareness. Would impress a hiring manager.
  4 — Strong. Mostly specific and well-reasoned with one minor weakness.
  3 — Pass. Adequate, no glaring errors, but generic — could be stronger with specifics.
  2 — Below the bar. Misses key considerations, drifts into generalities, or shows poor judgment.
  1 — Weak. Significantly off, evasive, or shows fundamental misunderstanding of the role.

You MUST output a JSON object only, with these keys:
  - overall_score: a number from 1 to 5 (decimals allowed, e.g. 3.5)
  - pass: true if overall_score >= 3, false otherwise
  - feedback_summary: 2–3 sentences. Lead with the strongest aspect; close with the single most actionable improvement. No headings, no markdown.

No preamble, no explanation outside the JSON.`;

export async function gradeMockInterviewResponse(
  args: GradeMockInterviewArgs
): Promise<GradeMockInterviewResult> {
  const spend = await checkSpendCap(createAdminClient());
  if (!spend.ok) {
    throw new Error(
      `Spend cap reached: $${spend.projectedUsd.toFixed(4)} would exceed $${spend.capUsd}`,
    );
  }

  const userMessage = `INTERVIEW PROMPT:
${args.prompt}

CANDIDATE RESPONSE:
${args.response}

Competency under test: ${args.competency}

Grade now.`;

  const message = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 800,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Concatenate all text blocks. Claude usually returns a single block.
  let raw = "";
  for (const block of message.content) {
    if (block.type === "text") raw += block.text;
  }

  // Strip code fences if Claude wrapped the JSON.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Grader returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  const validated = Output.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Grader output failed validation: ${validated.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  return {
    overallScore: validated.data.overall_score,
    pass: validated.data.pass,
    feedbackSummary: validated.data.feedback_summary,
  };
}
