import { describe, it, expect } from "vitest";
import {
  costUsd,
  estimateGradeCostUsd,
  priceFor,
  sumSpendUsd,
  MODEL_PRICING_USD_PER_MTOK,
} from "@/lib/anthropic/pricing";

describe("pricing", () => {
  it("returns the published Sonnet 4.5 rates", () => {
    expect(priceFor("claude-sonnet-4-5")).toEqual({ input: 3, output: 15 });
  });

  it("throws on an unknown model rather than silently under-pricing", () => {
    expect(() => priceFor("claude-unknown-v0")).toThrow(/Unknown model pricing/);
  });

  it("costUsd does MTok math correctly", () => {
    // 1M input tokens at $3 + 1M output tokens at $15 = $18
    expect(costUsd("claude-sonnet-4-5", 1_000_000, 1_000_000)).toBe(18);
    // 1k + 1k = $0.003 + $0.015 = $0.018
    expect(costUsd("claude-sonnet-4-5", 1000, 1000)).toBeCloseTo(0.018, 6);
  });

  it("estimateGradeCostUsd uses conservative defaults for Sonnet", () => {
    // 5000 * 3 + 2048 * 15 = 15000 + 30720 = 45720, /1e6 = $0.04572
    expect(estimateGradeCostUsd("claude-sonnet-4-5")).toBeCloseTo(0.04572, 5);
  });

  it("sumSpendUsd aggregates known-model rows correctly", () => {
    const total = sumSpendUsd([
      { model: "claude-sonnet-4-5", input_tokens: 1000, output_tokens: 500 },
      { model: "claude-sonnet-4-5", input_tokens: 2000, output_tokens: 1000 },
    ]);
    // (3000 * 3 + 1500 * 15) / 1e6 = (9000 + 22500) / 1e6 = 0.0315
    expect(total).toBeCloseTo(0.0315, 6);
  });

  it("sumSpendUsd treats unknown models as worst-case priced", () => {
    const worst = Object.values(MODEL_PRICING_USD_PER_MTOK).reduce(
      (max, p) => ({ input: Math.max(max.input, p.input), output: Math.max(max.output, p.output) }),
      { input: 0, output: 0 }
    );
    const total = sumSpendUsd([
      { model: null, input_tokens: 1000, output_tokens: 500 },
      { model: "made-up", input_tokens: 0, output_tokens: 0 },
    ]);
    const expected = (1000 * worst.input + 500 * worst.output) / 1_000_000;
    expect(total).toBeCloseTo(expected, 6);
  });

  it("sumSpendUsd treats null token columns as 0", () => {
    const total = sumSpendUsd([
      { model: "claude-sonnet-4-5", input_tokens: null, output_tokens: null },
    ]);
    expect(total).toBe(0);
  });
});
