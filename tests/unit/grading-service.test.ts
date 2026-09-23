import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

const { checkSpendCapMock, sendEmailMock } = vi.hoisted(() => ({
  checkSpendCapMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/grading/spend-guard", () => ({ checkSpendCap: checkSpendCapMock }));
vi.mock("@/lib/email/send", () => ({ sendEmail: sendEmailMock }));

import { gradeSubmission } from "@/lib/grading/service";

const RUBRIC = JSON.parse(
  readFileSync(resolve(__dirname, "..", "..", "docs/rubrics/raid-v1.json"), "utf8")
);
const PROMPT = readFileSync(
  resolve(__dirname, "..", "..", "docs/prompts/grade-raid-v1.md"),
  "utf8"
);

function validScore() {
  return {
    dimension_scores: RUBRIC.dimensions.map((d: { name: string }) => ({
      dimension: d.name,
      score: 4,
      justification: "Covers the key fields consistently with one gap.",
      quote: "R-001: Vendor deprecation; Owner: Integration Architect",
      suggestion: "Add follow-up date on R-003 and R-004.",
    })),
    overall_competency_score: 4.0,
    pass: true,
    hire_ready: false,
  };
}

function invalidScore() {
  // Too few dimensions — will fail the validator's `.length()` check.
  return {
    dimension_scores: [
      {
        dimension: RUBRIC.dimensions[0].name,
        score: 3,
        justification: "Only scored one dimension.",
        quote: "sample",
        suggestion: "Fill the rest.",
      },
    ],
    overall_competency_score: 3,
    pass: false,
    hire_ready: false,
  };
}

function claudeResponse(input: unknown): Anthropic.Messages.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5",
    stop_reason: "tool_use",
    stop_sequence: null,
    content: [
      {
        type: "tool_use",
        id: "toolu_test",
        name: "record_rubric_scores",
        input,
      },
    ],
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    },
  } as unknown as Anthropic.Messages.Message;
}

type Row = Record<string, unknown>;

/**
 * Stateful handler over the shared fake db. Reads are routed by table;
 * updates to `submissions` are applied to the in-memory row so the tests
 * can assert on the resulting status / score (values use Drizzle's
 * camelCase property names).
 */
function makeDbState() {
  const state = {
    submission: {
      id: "sub-1",
      user_id: "u-1",
      lesson_id: "lesson-1",
      extracted_text: "Learner submission text here." as string | null,
      status: "pending" as string,
    },
    submissionUpdates: {} as Record<string, unknown>,
    lesson: {
      scenario_text: "Scenario text.",
      competency: "risk_identification",
      prompt_name: "grade-raid",
    },
    rubric: { id: "rubric-1", schema_json: RUBRIC },
    prompt: { version: 1, body: PROMPT },
    rubricScores: [] as Row[],
  };

  fakeDb.reset((q) => {
    if (q.op === "select") {
      switch (q.table) {
        case "submissions":
          return [{ ...state.submission }];
        case "lessons":
          return [state.lesson];
        case "rubrics":
          return [state.rubric];
        case "prompts":
          return [state.prompt];
        default:
          return [];
      }
    }
    if (q.op === "update" && q.table === "submissions") {
      const set = q.set as Record<string, unknown>;
      Object.assign(state.submissionUpdates, set);
      if (typeof set.status === "string") state.submission.status = set.status;
      return [];
    }
    if (q.op === "insert" && q.table === "rubric_scores") {
      state.rubricScores.push(...(q.values as Row[]));
      return [];
    }
    return [];
  });

  return state;
}

describe("gradeSubmission", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    checkSpendCapMock.mockReset();
    sendEmailMock.mockReset().mockResolvedValue(undefined);
    checkSpendCapMock.mockResolvedValue({
      ok: true,
      spendTodayUsd: 0,
      capUsd: 100,
      projectedUsd: 0.05,
    });
  });

  it("happy path: writes 5 rubric_scores rows and flips submission to graded", async () => {
    const state = makeDbState();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValue(claudeResponse(validScore()));

    const result = await gradeSubmission("sub-1", {
      callClaude,
    });

    expect(result).toEqual({ ok: true, data: { status: "graded" } });
    expect(state.rubricScores).toHaveLength(5);
    expect(state.rubricScores[0]).toMatchObject({
      submissionId: "sub-1",
      rubricId: "rubric-1",
      promptVersion: 1,
      score: 4,
      inputTokens: 240,
      outputTokens: 60,
    });
    expect(state.submission.status).toBe("graded");
    expect(state.submissionUpdates).toMatchObject({
      overallScore: 4,
      pass: true,
      hireReady: false,
    });
    expect(callClaude).toHaveBeenCalledTimes(1);
  });

  it("retries once on validation failure and succeeds on second attempt", async () => {
    const state = makeDbState();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValueOnce(claudeResponse(invalidScore()))
      .mockResolvedValueOnce(claudeResponse(validScore()));

    const result = await gradeSubmission("sub-1", {
      callClaude,
    });

    expect(result).toEqual({ ok: true, data: { status: "graded" } });
    expect(callClaude).toHaveBeenCalledTimes(2);
    expect(state.rubricScores).toHaveLength(5);
  });

  it("marks submission grading_failed after two consecutive validation failures", async () => {
    const state = makeDbState();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValue(claudeResponse(invalidScore()));

    const result = await gradeSubmission("sub-1", {
      callClaude,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("GRADING_FAILED");
    expect(callClaude).toHaveBeenCalledTimes(2);
    expect(state.submission.status).toBe("grading_failed");
    expect(state.rubricScores).toHaveLength(0);
  });

  it("is idempotent on already-graded submissions", async () => {
    const state = makeDbState();
    state.submission.status = "graded";
    const callClaude = vi.fn<() => Promise<Anthropic.Messages.Message>>();

    const result = await gradeSubmission("sub-1", {
      callClaude,
    });

    expect(result).toEqual({ ok: true, data: { status: "already_graded" } });
    expect(callClaude).not.toHaveBeenCalled();
  });

  it("refuses to grade and flips status to grading_failed when the spend guard rejects", async () => {
    checkSpendCapMock.mockResolvedValueOnce({
      ok: false,
      spendTodayUsd: 99,
      capUsd: 100,
      projectedUsd: 101,
      code: "COST_CAP_EXCEEDED",
    });
    const state = makeDbState();
    const callClaude = vi.fn<() => Promise<Anthropic.Messages.Message>>();

    const result = await gradeSubmission("sub-1", {
      callClaude,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("COST_CAP_EXCEEDED");
    expect(callClaude).not.toHaveBeenCalled();
    expect(state.submission.status).toBe("grading_failed");
  });

  it("returns NO_EXTRACTED_TEXT when the submission has no extracted text", async () => {
    const state = makeDbState();
    state.submission.extracted_text = "";

    const result = await gradeSubmission("sub-1", {
      callClaude: vi.fn(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_EXTRACTED_TEXT");
  });
});
