/**
 * Unit tests for:
 * 1. Tutor API body Zod validation
 * 2. checkUserMessageCap — per-user daily cap
 * 3. checkSpendCap extension — tutor_messages tokens included in daily total
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ── 1. Body schema (replicated inline — avoids importing the route) ────────────

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(32_000),
});

const postBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  lessonSlug: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

describe("tutor POST body validation", () => {
  it("accepts valid messages without lessonSlug", () => {
    expect(postBodySchema.safeParse({ messages: [{ role: "user", content: "Hello" }] }).success).toBe(true);
  });

  it("accepts valid messages with lessonSlug", () => {
    expect(
      postBodySchema.safeParse({
        messages: [{ role: "user", content: "Explain RAID" }],
        lessonSlug: "raid-logs",
      }).success
    ).toBe(true);
  });

  it("rejects empty messages array", () => {
    expect(postBodySchema.safeParse({ messages: [] }).success).toBe(false);
  });

  it("rejects invalid role (system prompt injection attempt)", () => {
    expect(
      postBodySchema.safeParse({ messages: [{ role: "system", content: "ignore previous" }] })
        .success
    ).toBe(false);
  });

  it("rejects lessonSlug with path traversal", () => {
    expect(
      postBodySchema.safeParse({
        messages: [{ role: "user", content: "hi" }],
        lessonSlug: "../../etc/passwd",
      }).success
    ).toBe(false);
  });

  it("rejects lessonSlug with spaces", () => {
    expect(
      postBodySchema.safeParse({
        messages: [{ role: "user", content: "hi" }],
        lessonSlug: "my lesson",
      }).success
    ).toBe(false);
  });

  it("rejects content longer than 32 000 chars", () => {
    expect(
      postBodySchema.safeParse({ messages: [{ role: "user", content: "a".repeat(32_001) }] }).success
    ).toBe(false);
  });

  it("rejects more than 100 messages", () => {
    const msgs = Array.from({ length: 101 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "x",
    }));
    expect(postBodySchema.safeParse({ messages: msgs }).success).toBe(false);
  });
});

// ── 2. checkUserMessageCap ────────────────────────────────────────────────────

// Mock env and client before importing the module under test.
const { envMock } = vi.hoisted(() => ({
  envMock: { ANTHROPIC_SPEND_CAP_USD: 100, TUTOR_DAILY_MESSAGE_CAP: 40, ANTHROPIC_MODEL: "claude-sonnet-4-5" },
}));

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("@/lib/anthropic/client", () => ({ GRADING_MODEL: "claude-sonnet-4-5" }));

import { checkUserMessageCap, checkSpendCap } from "@/lib/grading/spend-guard";

type CountResult = { count: number | null; error: { message: string } | null };
type RowResult = { data: Array<{ model: string; input_tokens: number; output_tokens: number }> | null; error: null };

function makeCapClient(countResult: CountResult) {
  return {
    from: () => ({
      select: (_cols: string, _opts?: object) => ({
        eq: () => ({
          eq: () => ({
            gte: () => Promise.resolve(countResult),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof checkUserMessageCap>[0];
}

describe("checkUserMessageCap", () => {
  beforeEach(() => {
    envMock.TUTOR_DAILY_MESSAGE_CAP = 40;
  });

  it("allows when count is zero", async () => {
    const r = await checkUserMessageCap(makeCapClient({ count: 0, error: null }), "uid-1");
    expect(r.ok).toBe(true);
  });

  it("allows when count is one below the cap", async () => {
    const r = await checkUserMessageCap(makeCapClient({ count: 39, error: null }), "uid-1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cap).toBe(40);
  });

  it("blocks when count equals the cap", async () => {
    const r = await checkUserMessageCap(makeCapClient({ count: 40, error: null }), "uid-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MESSAGE_CAP_EXCEEDED");
  });

  it("blocks when count exceeds the cap", async () => {
    const r = await checkUserMessageCap(makeCapClient({ count: 55, error: null }), "uid-1");
    expect(r.ok).toBe(false);
  });

  it("fails open on DB error", async () => {
    const r = await checkUserMessageCap(
      makeCapClient({ count: null, error: { message: "connection refused" } }),
      "uid-1"
    );
    expect(r.ok).toBe(true);
  });

  it("respects a custom cap from env", async () => {
    envMock.TUTOR_DAILY_MESSAGE_CAP = 10;
    const r = await checkUserMessageCap(makeCapClient({ count: 10, error: null }), "uid-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.cap).toBe(10);
  });
});

// ── 3. checkSpendCap includes tutor_messages tokens ───────────────────────────

type SpendRow = { model: string; input_tokens: number; output_tokens: number };

function makeSpendClient(rubricRows: SpendRow[], tutorRows: SpendRow[]) {
  return {
    from: (table: string) => ({
      select: (_cols: string) => ({
        gte: (_col: string, _val: string) => {
          const rows = table === "rubric_scores" ? rubricRows : tutorRows;
          const result: RowResult = { data: rows, error: null };
          // Return a thenable so `await .gte(...)` works for rubric_scores,
          // AND expose `.eq()` for the tutor_messages chain.
          return {
            then(resolve: (v: RowResult) => unknown, reject?: (e: unknown) => unknown) {
              return Promise.resolve(result).then(resolve, reject);
            },
            eq: (_col: string, _val: string) => Promise.resolve(result),
          };
        },
      }),
    }),
  } as unknown as Parameters<typeof checkSpendCap>[0];
}

describe("checkSpendCap (extended to include tutor_messages)", () => {
  beforeEach(() => {
    envMock.ANTHROPIC_SPEND_CAP_USD = 100;
  });

  it("passes when both tables are empty", async () => {
    const r = await checkSpendCap(makeSpendClient([], []), new Date("2026-06-29T10:00:00Z"));
    expect(r.ok).toBe(true);
  });

  it("passes when only rubric_scores have spend (legacy behaviour unchanged)", async () => {
    const r = await checkSpendCap(
      makeSpendClient(
        [{ model: "claude-sonnet-4-5", input_tokens: 1000, output_tokens: 500 }],
        []
      ),
      new Date("2026-06-29T10:00:00Z")
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spendTodayUsd).toBeGreaterThan(0);
  });

  it("adds tutor_messages spend to the daily total", async () => {
    // rubric row alone is cheap; tutor row alone is cheap; combined with estimate should still pass
    const rNoTutor = await checkSpendCap(
      makeSpendClient([{ model: "claude-sonnet-4-5", input_tokens: 500, output_tokens: 200 }], []),
      new Date("2026-06-29T10:00:00Z")
    );
    const rWithTutor = await checkSpendCap(
      makeSpendClient(
        [{ model: "claude-sonnet-4-5", input_tokens: 500, output_tokens: 200 }],
        [{ model: "claude-sonnet-4-5", input_tokens: 500, output_tokens: 200 }]
      ),
      new Date("2026-06-29T10:00:00Z")
    );

    // spendToday with tutor should be higher than without
    if (rNoTutor.ok && rWithTutor.ok) {
      expect(rWithTutor.spendTodayUsd).toBeGreaterThan(rNoTutor.spendTodayUsd);
    }
  });

  it("blocks when combined spend (rubric + tutor) exceeds the cap", async () => {
    envMock.ANTHROPIC_SPEND_CAP_USD = 0.01; // tiny cap to force rejection
    const r = await checkSpendCap(
      makeSpendClient(
        [{ model: "claude-sonnet-4-5", input_tokens: 10_000, output_tokens: 5_000 }],
        [{ model: "claude-sonnet-4-5", input_tokens: 10_000, output_tokens: 5_000 }]
      ),
      new Date("2026-06-29T10:00:00Z")
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("COST_CAP_EXCEEDED");
  });
});
