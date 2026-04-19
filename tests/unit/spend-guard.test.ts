import { describe, it, expect, vi, beforeEach } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: { ANTHROPIC_SPEND_CAP_USD: 100 },
}));

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("@/lib/anthropic/client", () => ({
  GRADING_MODEL: "claude-sonnet-4-5",
}));

import { checkSpendCap } from "@/lib/grading/spend-guard";

type Row = { model: string; input_tokens: number; output_tokens: number };

function fakeSupabase(rows: Row[]) {
  const gteMock = vi.fn(async () => ({ data: rows, error: null }));
  return {
    from: (_table: string) => ({
      select: (_cols: string) => ({ gte: gteMock }),
    }),
    _gteMock: gteMock,
  } as unknown as Parameters<typeof checkSpendCap>[0] & { _gteMock: typeof gteMock };
}

beforeEach(() => {
  envMock.ANTHROPIC_SPEND_CAP_USD = 100;
});

describe("checkSpendCap", () => {
  it("passes when today's spend plus one estimate stays under the cap", async () => {
    const supa = fakeSupabase([
      { model: "claude-sonnet-4-5", input_tokens: 1000, output_tokens: 500 },
    ]);
    const r = await checkSpendCap(supa);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.capUsd).toBe(100);
      expect(r.spendTodayUsd).toBeCloseTo(0.0105, 5);
      // spend + estimate should match projectedUsd
      expect(r.projectedUsd).toBeCloseTo(r.spendTodayUsd + 0.04572, 4);
    }
  });

  it("rejects when projected spend would exceed the cap", async () => {
    envMock.ANTHROPIC_SPEND_CAP_USD = 0.05;
    const supa = fakeSupabase([
      { model: "claude-sonnet-4-5", input_tokens: 5000, output_tokens: 2048 },
    ]);
    const r = await checkSpendCap(supa);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("COST_CAP_EXCEEDED");
      expect(r.projectedUsd).toBeGreaterThan(r.capUsd);
    }
  });

  it("queries rubric_scores filtered by start-of-UTC-day", async () => {
    const supa = fakeSupabase([]);
    const now = new Date("2026-04-19T08:30:00Z");
    await checkSpendCap(supa, now);
    // Grab the arg the mock was called with.
    const [col, value] = supa._gteMock.mock.calls[0]!;
    expect(col).toBe("created_at");
    expect(value).toBe("2026-04-19T00:00:00.000Z");
  });

  it("treats an empty day as 0 spend", async () => {
    const supa = fakeSupabase([]);
    const r = await checkSpendCap(supa);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spendTodayUsd).toBe(0);
  });
});
