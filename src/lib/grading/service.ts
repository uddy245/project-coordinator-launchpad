import type Anthropic from "@anthropic-ai/sdk";
import {
  anthropic,
  GRADING_MODEL,
  GRADING_TEMPERATURE,
  GRADING_MAX_TOKENS,
} from "@/lib/anthropic/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { parseRubric, type RubricJSON } from "./rubric";
import { renderPrompt } from "./prompt";
import { buildGradeTool, GRADE_TOOL_NAME } from "./tool-schema";
import { buildScoreValidator, type ScoreOutput } from "./validator";
import { shouldSample } from "./audit-sampler";

export type GradeSubmissionDeps = {
  supabase?: ReturnType<typeof createAdminClient>;
  callClaude?: (
    args: Anthropic.Messages.MessageCreateParamsNonStreaming
  ) => Promise<Anthropic.Messages.Message>;
};

export type GradeWithContextInput = {
  rubric: RubricJSON;
  promptBody: string;
  scenarioText: string;
  submissionText: string;
};

export type GradeWithContextResult = {
  score: ScoreOutput;
  inputTokens: number;
  outputTokens: number;
};

/**
 * DB-free grading primitive: given a rubric + prompt + scenario +
 * submission text, call Claude with tool-use forced and validate the
 * output against the rubric-derived Zod schema. Retries once on
 * validation failure. Used directly by the calibration corpus test
 * (no DB, no side effects) and by gradeSubmission (which wraps it
 * with DB I/O).
 */
export async function gradeWithContext(
  input: GradeWithContextInput,
  deps: Pick<GradeSubmissionDeps, "callClaude"> = {}
): Promise<ActionResult<GradeWithContextResult>> {
  const callClaude = deps.callClaude ?? ((args) => anthropic.messages.create(args));

  const tool = buildGradeTool(input.rubric);
  const validator = buildScoreValidator(input.rubric);

  const baseUserPrompt = renderPrompt(input.promptBody, {
    rubric_json: JSON.stringify(input.rubric),
    scenario_text: input.scenarioText,
    submission_text: input.submissionText,
  });

  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: baseUserPrompt }];

  let score: ScoreOutput | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastValidationError: string | null = null;

  for (let attempt = 0; attempt < 2 && !score; attempt++) {
    const response = await callClaude({
      model: GRADING_MODEL,
      max_tokens: GRADING_MAX_TOKENS,
      temperature: GRADING_TEMPERATURE,
      tools: [tool],
      tool_choice: { type: "tool", name: GRADE_TOOL_NAME },
      messages,
    });

    inputTokens += response.usage.input_tokens ?? 0;
    outputTokens += response.usage.output_tokens ?? 0;

    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock =>
        b.type === "tool_use" && b.name === GRADE_TOOL_NAME
    );

    if (!toolUse) {
      lastValidationError = "Claude did not call record_rubric_scores.";
    } else {
      const parsed = validator.safeParse(toolUse.input);
      if (parsed.success) {
        score = parsed.data;
        break;
      }
      lastValidationError = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    }

    messages.push({
      role: "user",
      content: `Your previous response failed validation: ${lastValidationError}. Re-emit the tool call with all required fields.`,
    });
  }

  if (!score) {
    return {
      ok: false,
      error: lastValidationError ?? "Grading failed after retries",
      code: "GRADING_FAILED",
    };
  }

  return { ok: true, data: { score, inputTokens, outputTokens } };
}

type LoadedContext = {
  submissionId: string;
  userId: string;
  lessonId: string;
  scenario: string;
  extracted: string;
  rubricRow: { id: string; schema_json: unknown };
  promptRow: { version: number; body: string };
  rubric: RubricJSON;
};

/**
 * gradeSubmission is the beating heart of the product. Flow:
 *
 *   1. Load submission, lesson scenario, current rubric, current prompt.
 *   2. If submission is not pending, return idempotent success.
 *   3. Flip status → 'grading'.
 *   4. Build tool schema + user prompt; call Claude with tool_choice
 *      forcing record_rubric_scores.
 *   5. Validate the tool input with a rubric-derived Zod schema.
 *   6. On validation failure: retry once with the error appended to
 *      the user message.
 *   7. On two consecutive failures: flip status → 'grading_failed'.
 *   8. On success: insert one rubric_scores row per dimension, write
 *      overall_score / pass / hire_ready / graded_at on the submission.
 *
 * Dependencies are injectable (supabase + Claude call) so the integration
 * test can assert the retry path without hitting the real API.
 */
export async function gradeSubmission(
  submissionId: string,
  deps: GradeSubmissionDeps = {}
): Promise<ActionResult<{ status: "graded" | "grading_failed" | "already_graded" }>> {
  const supabase = deps.supabase ?? createAdminClient();

  const loaded = await loadContext(supabase, submissionId);
  if (!loaded.ok) return loaded;
  const ctx = loaded.data;

  // Idempotency: another run already claimed this one.
  const { data: currentStatus } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .single();
  if (currentStatus?.status === "graded") {
    return { ok: true, data: { status: "already_graded" } };
  }
  if (currentStatus?.status === "grading_failed") {
    return { ok: true, data: { status: "grading_failed" } };
  }

  await supabase.from("submissions").update({ status: "grading" }).eq("id", submissionId);

  const graded = await gradeWithContext(
    {
      rubric: ctx.rubric,
      promptBody: ctx.promptRow.body,
      scenarioText: ctx.scenario,
      submissionText: ctx.extracted,
    },
    { callClaude: deps.callClaude }
  );

  if (!graded.ok) {
    await supabase
      .from("submissions")
      .update({
        status: "grading_failed",
        graded_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return graded;
  }

  const { score, inputTokens, outputTokens } = graded.data;

  // Persist per-dimension scores. Tokens are split evenly across the
  // rows for MVP — aggregate cost is what we care about; per-dimension
  // breakdown would need a separate schema for marginal use.
  const rowsToInsert = score.dimension_scores.map((d) => ({
    submission_id: submissionId,
    rubric_id: ctx.rubricRow.id,
    dimension: d.dimension,
    score: d.score,
    justification: d.justification,
    quote: d.quote,
    suggestion: d.suggestion,
    model: GRADING_MODEL,
    prompt_version: ctx.promptRow.version,
    input_tokens: Math.round(inputTokens / score.dimension_scores.length),
    output_tokens: Math.round(outputTokens / score.dimension_scores.length),
  }));

  const { error: insertErr } = await supabase.from("rubric_scores").insert(rowsToInsert);

  if (insertErr) {
    // Rare path: DB write failed after a good grade. Don't mark failed —
    // rely on the unique(submission_id, dimension) constraint to make a
    // retry safe.
    return {
      ok: false,
      error: `DB write failed: ${insertErr.message}`,
      code: "DB_ERROR",
    };
  }

  const { error: updateErr } = await supabase
    .from("submissions")
    .update({
      status: "graded",
      overall_score: score.overall_competency_score,
      pass: score.pass,
      hire_ready: score.hire_ready,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateErr) {
    return {
      ok: false,
      error: `Submission update failed: ${updateErr.message}`,
      code: "DB_ERROR",
    };
  }

  // 10% deterministic sampling into the audit queue. Unique constraint
  // on audit_queue.submission_id makes this idempotent — if we sampled
  // on a prior run and the row exists, this no-ops silently.
  if (shouldSample(submissionId)) {
    await supabase.from("audit_queue").insert({ submission_id: submissionId, reason: "sampled" });
  }

  return { ok: true, data: { status: "graded" } };
}

async function loadContext(
  supabase: ReturnType<typeof createAdminClient>,
  submissionId: string
): Promise<ActionResult<LoadedContext>> {
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, user_id, lesson_id, extracted_text, status")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    return { ok: false, error: "Submission not found", code: "NOT_FOUND" };
  }
  if (!sub.extracted_text) {
    return {
      ok: false,
      error: "Submission has no extracted text",
      code: "NO_EXTRACTED_TEXT",
    };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("scenario_text")
    .eq("id", sub.lesson_id)
    .single();

  if (!lesson?.scenario_text) {
    return { ok: false, error: "Lesson scenario missing", code: "NOT_FOUND" };
  }

  const { data: rubricRow } = await supabase
    .from("rubrics")
    .select("id, schema_json")
    .eq("competency", "risk_identification")
    .eq("is_current", true)
    .single();

  if (!rubricRow) {
    return { ok: false, error: "No current rubric", code: "NOT_FOUND" };
  }

  const { data: promptRow } = await supabase
    .from("prompts")
    .select("version, body")
    .eq("name", "grade-raid")
    .eq("is_current", true)
    .single();

  if (!promptRow) {
    return { ok: false, error: "No current prompt", code: "NOT_FOUND" };
  }

  const rubric = parseRubric(rubricRow.schema_json);

  return {
    ok: true,
    data: {
      submissionId: sub.id,
      userId: sub.user_id,
      lessonId: sub.lesson_id,
      scenario: lesson.scenario_text,
      extracted: sub.extracted_text,
      rubricRow,
      promptRow,
      rubric,
    },
  };
}
