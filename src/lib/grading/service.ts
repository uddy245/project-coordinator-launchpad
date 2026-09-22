import type Anthropic from "@anthropic-ai/sdk";
import {
  anthropic,
  GRADING_MODEL,
  GRADING_TEMPERATURE,
  GRADING_MAX_TOKENS,
} from "@/lib/anthropic/client";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditQueue,
  lessons,
  profiles,
  prompts,
  rubricScores,
  rubrics,
  submissions,
  usersInAuth,
} from "@/db/schema";
import type { ActionResult } from "@/lib/types";
import { parseRubric, type RubricJSON } from "./rubric";
import { renderPrompt } from "./prompt";
import { buildGradeTool, GRADE_TOOL_NAME } from "./tool-schema";
import { buildScoreValidator, type ScoreOutput } from "./validator";
import { shouldSample } from "./audit-sampler";
import { checkSpendCap } from "./spend-guard";
import { sendEmail } from "@/lib/email/send";
import { renderGradingComplete } from "@/lib/email/templates/grading-complete";

export type GradeSubmissionDeps = {
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
 * The Claude call is injectable so the integration
 * test can assert the retry path without hitting the real API.
 */
export async function gradeSubmission(
  submissionId: string,
  deps: GradeSubmissionDeps = {}
): Promise<ActionResult<{ status: "graded" | "grading_failed" | "already_graded" }>> {
  const loaded = await loadContext(submissionId);
  if (!loaded.ok) return loaded;
  const ctx = loaded.data;

  // Idempotency: another run already claimed this one.
  const currentStatus = await firstOrNull(
    db
      .select({ status: submissions.status })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)
  );
  if (currentStatus?.status === "graded") {
    return { ok: true, data: { status: "already_graded" } };
  }
  if (currentStatus?.status === "grading_failed") {
    return { ok: true, data: { status: "grading_failed" } };
  }

  // Daily spend guard: refuse to grade if today's projected spend
  // would exceed ANTHROPIC_SPEND_CAP_USD. Flips the submission to
  // grading_failed so the user sees a clear state, and returns a
  // distinct error code so callers can distinguish cost-cap rejection
  // from a Claude failure.
  const spend = await checkSpendCap();
  if (!spend.ok) {
    await setStatus(submissionId, {
      status: "grading_failed",
      gradedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      error: `Daily Anthropic spend cap would be exceeded ($${spend.spendTodayUsd.toFixed(2)} spent, $${spend.capUsd.toFixed(2)} cap).`,
      code: "COST_CAP_EXCEEDED",
    };
  }

  await setStatus(submissionId, { status: "grading" });

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
    await setStatus(submissionId, {
      status: "grading_failed",
      gradedAt: new Date().toISOString(),
    });
    return graded;
  }

  const { score, inputTokens, outputTokens } = graded.data;

  // Persist per-dimension scores. Tokens are split evenly across the
  // rows for MVP — aggregate cost is what we care about; per-dimension
  // breakdown would need a separate schema for marginal use.
  const rowsToInsert = score.dimension_scores.map((d) => ({
    submissionId,
    rubricId: ctx.rubricRow.id,
    dimension: d.dimension,
    score: d.score,
    justification: d.justification,
    quote: d.quote,
    suggestion: d.suggestion,
    model: GRADING_MODEL,
    promptVersion: ctx.promptRow.version,
    inputTokens: Math.round(inputTokens / score.dimension_scores.length),
    outputTokens: Math.round(outputTokens / score.dimension_scores.length),
  }));

  try {
    await db.insert(rubricScores).values(rowsToInsert);
  } catch (err) {
    // Rare path: DB write failed after a good grade. Don't mark failed —
    // rely on the unique(submission_id, dimension) constraint to make a
    // retry safe.
    return {
      ok: false,
      error: `DB write failed: ${errMessage(err)}`,
      code: "DB_ERROR",
    };
  }

  try {
    await db
      .update(submissions)
      .set({
        status: "graded",
        overallScore: score.overall_competency_score,
        pass: score.pass,
        hireReady: score.hire_ready,
        gradedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, submissionId));
  } catch (err) {
    return {
      ok: false,
      error: `Submission update failed: ${errMessage(err)}`,
      code: "DB_ERROR",
    };
  }

  // 10% deterministic sampling into the audit queue. Unique constraint
  // on audit_queue.submission_id makes this idempotent — if we sampled
  // on a prior run and the row exists, this no-ops silently.
  if (shouldSample(submissionId)) {
    await db
      .insert(auditQueue)
      .values({ submissionId, reason: "sampled" })
      .onConflictDoNothing({ target: auditQueue.submissionId })
      .catch((err) => console.error("[grading] audit sample insert failed:", errMessage(err)));
  }

  // Notify the learner — silent so a Resend hiccup doesn't fail the grade.
  void notifyGradingComplete(submissionId, score);

  return { ok: true, data: { status: "graded" } };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** First row or null; swallows DB errors (Supabase `{ data: null }` semantics). */
async function firstOrNull<T>(query: PromiseLike<T[]>): Promise<T | null> {
  try {
    return (await query)[0] ?? null;
  } catch (err) {
    console.error("[grading] query failed:", errMessage(err));
    return null;
  }
}

/** Status write whose failure the old code ignored — log, never throw. */
async function setStatus(
  submissionId: string,
  values: Pick<typeof submissions.$inferInsert, "status" | "gradedAt">
): Promise<void> {
  try {
    await db.update(submissions).set(values).where(eq(submissions.id, submissionId));
  } catch (err) {
    console.error("[grading] status update failed:", errMessage(err));
  }
}

/** profiles.email, falling back to auth.users.email (replaces auth.admin.getUserById). */
async function getUserEmail(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (p?.email) return p.email;
  const [u] = await db
    .select({ email: usersInAuth.email })
    .from(usersInAuth)
    .where(eq(usersInAuth.id, userId))
    .limit(1);
  return u?.email ?? null;
}

/** Look up the user/lesson and send the graded-submission email. Best-effort. */
async function notifyGradingComplete(submissionId: string, score: ScoreOutput): Promise<void> {
  try {
    const [row] = await db
      .select({
        id: submissions.id,
        user_id: submissions.userId,
        lesson_slug: lessons.slug,
        lesson_title: lessons.title,
        full_name: profiles.fullName,
      })
      .from(submissions)
      .innerJoin(profiles, eq(profiles.id, submissions.userId))
      .leftJoin(lessons, eq(lessons.id, submissions.lessonId))
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!row?.user_id) return;

    const recipientEmail = await getUserEmail(row.user_id);
    if (!recipientEmail) return;

    const lesson = { slug: row.lesson_slug, title: row.lesson_title };
    const fullName = row.full_name ?? null;
    const firstName = fullName ? (fullName.split(/\s+/)[0] ?? null) : null;

    // Build a short summary from the strongest and weakest dimensions.
    const sorted = [...score.dimension_scores].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const summary = score.hire_ready
      ? `Strong work — your ${top.dimension} stood out (${top.score}/5). Full per-dimension breakdown is on the submission page.`
      : score.pass
        ? `You passed. Strongest: ${top.dimension} (${top.score}/5). Most room to grow: ${bottom.dimension} (${bottom.score}/5).`
        : `The grader flagged ${bottom.dimension} (${bottom.score}/5) as the dimension to revisit. Detailed comments and a suggested next step are on the submission page.`;

    await sendEmail({
      to: { email: recipientEmail, name: fullName },
      render: renderGradingComplete({
        firstName,
        lessonTitle: lesson?.title ?? "your submission",
        lessonSlug: lesson?.slug ?? "",
        submissionId,
        // overall_competency_score is 1..5; normalise to 0..1 for the email.
        overallScore: (score.overall_competency_score - 1) / 4,
        passed: score.pass,
        hireReady: score.hire_ready,
        summary,
      }),
      silent: true,
      tag: "grading-complete",
    });
  } catch (err) {
    console.error("[email] grading-complete send failed:", err);
  }
}

async function loadContext(submissionId: string): Promise<ActionResult<LoadedContext>> {
  const sub = await firstOrNull(
    db
      .select({
        id: submissions.id,
        user_id: submissions.userId,
        lesson_id: submissions.lessonId,
        extracted_text: submissions.extractedText,
        status: submissions.status,
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)
  );

  if (!sub) {
    return { ok: false, error: "Submission not found", code: "NOT_FOUND" };
  }
  if (!sub.extracted_text) {
    return {
      ok: false,
      error: "Submission has no extracted text",
      code: "NO_EXTRACTED_TEXT",
    };
  }

  const lesson = await firstOrNull(
    db
      .select({
        scenario_text: lessons.scenarioText,
        competency: lessons.competency,
        prompt_name: lessons.promptName,
      })
      .from(lessons)
      .where(eq(lessons.id, sub.lesson_id))
      .limit(1)
  );

  if (!lesson?.scenario_text) {
    return { ok: false, error: "Lesson scenario missing", code: "NOT_FOUND" };
  }
  if (!lesson.competency || !lesson.prompt_name) {
    return {
      ok: false,
      error: "Lesson missing competency or prompt_name",
      code: "NOT_FOUND",
    };
  }

  const rubricRow = await firstOrNull(
    db
      .select({ id: rubrics.id, schema_json: rubrics.schemaJson })
      .from(rubrics)
      .where(and(eq(rubrics.competency, lesson.competency), eq(rubrics.isCurrent, true)))
      .limit(1)
  );

  if (!rubricRow) {
    return { ok: false, error: "No current rubric", code: "NOT_FOUND" };
  }

  const promptRow = await firstOrNull(
    db
      .select({ version: prompts.version, body: prompts.body })
      .from(prompts)
      .where(and(eq(prompts.name, lesson.prompt_name), eq(prompts.isCurrent, true)))
      .limit(1)
  );

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
