import { describe, it, expect, vi, beforeEach } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: { ANTHROPIC_SPEND_CAP_USD: 100 },
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/anthropic/client", () => ({
  GRADING_MODEL: "claude-sonnet-4-5",
}));

import { checkSpendCap } from "@/lib/grading/spend-guard";

type Row = { model: string; input_tokens: number; output_tokens: number };

// rubric_scores returns `rows`; tutor_messages is always empty here so the
// grading-spend maths is tested in isolation.
function withRubricRows(rows: Row[]) {
  fakeDb.reset((q) => (q.table === "rubric_scores" ? rows : []));
}

beforeEach(() => {
  envMock.ANTHROPIC_SPEND_CAP_USD = 100;
  withRubricRows([]);
});

describe("checkSpendCap", () => {
  it("passes when today's spend plus one estimate stays under the cap", async () => {
    withRubricRows([{ model: "claude-sonnet-4-5", input_tokens: 1000, output_tokens: 500 }]);
    const r = await checkSpendCap();
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
    withRubricRows([{ model: "claude-sonnet-4-5", input_tokens: 5000, output_tokens: 2048 }]);
    const r = await checkSpendCap();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("COST_CAP_EXCEEDED");
      expect(r.projectedUsd).toBeGreaterThan(r.capUsd);
    }
  });

  it("queries both metered tables (rubric_scores + tutor_messages)", async () => {
    await checkSpendCap(new Date("2026-04-19T08:30:00Z"));
    expect(fakeDb.callsFor("select", "rubric_scores")).toHaveLength(1);
    expect(fakeDb.callsFor("select", "tutor_messages")).toHaveLength(1);
  });

  it("treats an empty day as 0 spend", async () => {
    const r = await checkSpendCap();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spendTodayUsd).toBe(0);
  });
});
