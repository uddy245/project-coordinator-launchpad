import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

const { checkSpendCapMock } = vi.hoisted(() => ({ checkSpendCapMock: vi.fn() }));
vi.mock("@/lib/grading/spend-guard", () => ({ checkSpendCap: checkSpendCapMock }));

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

function makeFakeSupabase() {
  // Minimal in-memory mock — good enough to exercise the orchestrator
  // reads and writes without running against a real DB. The grading
  // service only does .from(table).select()/update()/insert() — we
  // can fake those with a chainable object per table.
  const state = {
    submission: {
      id: "sub-1",
      user_id: "u-1",
      lesson_id: "lesson-1",
      extracted_text: "Learner submission text here.",
      status: "pending" as string,
      overall_score: null as number | null,
      pass: null as boolean | null,
      hire_ready: null as boolean | null,
      graded_at: null as string | null,
    },
    lesson: {
      scenario_text: "Scenario text.",
      competency: "risk_identification",
      prompt_name: "grade-raid",
    },
    rubric: { id: "rubric-1", schema_json: RUBRIC },
    prompt: { version: 1, body: PROMPT },
    rubricScores: [] as Row[],
  };

  const submissionsTable = {
    select: (_cols?: string) => ({
      eq: (_col: string, _val: string) => ({
        single: async () => ({ data: { ...state.submission }, error: null }),
      }),
    }),
    update: (patch: Record<string, unknown>) => ({
      eq: async (_col: string, _val: string) => {
        Object.assign(state.submission, patch);
        return { error: null };
      },
    }),
    insert: async (_rows: Row[]) => ({ error: null }),
  };

  const lessonsTable = {
    select: () => ({
      eq: () => ({
        single: async () => ({ data: state.lesson, error: null }),
      }),
    }),
  };

  const rubricsTable = {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: state.rubric, error: null }),
        }),
      }),
    }),
  };

  const promptsTable = {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: state.prompt, error: null }),
        }),
      }),
    }),
  };

  const rubricScoresTable = {
    insert: async (rows: Row[]) => {
      state.rubricScores.push(...rows);
      return { error: null };
    },
    // Used by the spend guard — return today's already-graded rows.
    select: (_cols?: string) => ({
      gte: async (_col: string, _val: string) => ({ data: state.rubricScores, error: null }),
    }),
  };

  const auditQueueTable = {
    insert: async (_row: Row) => ({ error: null }),
  };

  const from = (table: string) => {
    if (table === "submissions") return submissionsTable;
    if (table === "lessons") return lessonsTable;
    if (table === "rubrics") return rubricsTable;
    if (table === "prompts") return promptsTable;
    if (table === "rubric_scores") return rubricScoresTable;
    if (table === "audit_queue") return auditQueueTable;
    throw new Error("unexpected table: " + table);
  };

  return { from, _state: state };
}

describe("gradeSubmission", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    checkSpendCapMock.mockReset();
    checkSpendCapMock.mockResolvedValue({
      ok: true,
      spendTodayUsd: 0,
      capUsd: 100,
      projectedUsd: 0.05,
    });
  });

  it("happy path: writes 5 rubric_scores rows and flips submission to graded", async () => {
    const supabase = makeFakeSupabase();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValue(claudeResponse(validScore()));

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
      callClaude,
    });

    expect(result).toEqual({ ok: true, data: { status: "graded" } });
    expect(supabase._state.rubricScores).toHaveLength(5);
    expect(supabase._state.submission.status).toBe("graded");
    expect(supabase._state.submission.overall_score).toBe(4);
    expect(callClaude).toHaveBeenCalledTimes(1);
  });

  it("retries once on validation failure and succeeds on second attempt", async () => {
    const supabase = makeFakeSupabase();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValueOnce(claudeResponse(invalidScore()))
      .mockResolvedValueOnce(claudeResponse(validScore()));

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
      callClaude,
    });

    expect(result).toEqual({ ok: true, data: { status: "graded" } });
    expect(callClaude).toHaveBeenCalledTimes(2);
    expect(supabase._state.rubricScores).toHaveLength(5);
  });

  it("marks submission grading_failed after two consecutive validation failures", async () => {
    const supabase = makeFakeSupabase();
    const callClaude = vi
      .fn<() => Promise<Anthropic.Messages.Message>>()
      .mockResolvedValue(claudeResponse(invalidScore()));

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
      callClaude,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("GRADING_FAILED");
    expect(callClaude).toHaveBeenCalledTimes(2);
    expect(supabase._state.submission.status).toBe("grading_failed");
    expect(supabase._state.rubricScores).toHaveLength(0);
  });

  it("is idempotent on already-graded submissions", async () => {
    const supabase = makeFakeSupabase();
    supabase._state.submission.status = "graded";
    const callClaude = vi.fn<() => Promise<Anthropic.Messages.Message>>();

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
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
    const supabase = makeFakeSupabase();
    const callClaude = vi.fn<() => Promise<Anthropic.Messages.Message>>();

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
      callClaude,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("COST_CAP_EXCEEDED");
    expect(callClaude).not.toHaveBeenCalled();
    expect(supabase._state.submission.status).toBe("grading_failed");
  });

  it("returns NO_EXTRACTED_TEXT when the submission has no extracted text", async () => {
    const supabase = makeFakeSupabase();
    supabase._state.submission.extracted_text = "";

    const result = await gradeSubmission("sub-1", {
      supabase: supabase as unknown as ReturnType<
        typeof import("@/lib/supabase/admin").createAdminClient
      >,
      callClaude: vi.fn(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_EXTRACTED_TEXT");
  });
});
