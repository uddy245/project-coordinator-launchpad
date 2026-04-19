import { describe, it, expect } from "vitest";
import { applyOverrides } from "@/lib/grading/apply-overrides";
import type { RubricJSON } from "@/lib/grading/rubric";
import type { RubricScoreRow } from "@/components/grading/rubric-score-card";

const rubric: RubricJSON = {
  rubric_id: "raid-v1",
  rubric_version: "1.0.0",
  competency: "risk_identification",
  competency_label: "RAID Log Discipline",
  pass_threshold: 3,
  hire_ready_threshold: 4,
  dimensions: [
    { name: "a", description: "", weight: 0.5, anchors: {} },
    { name: "b", description: "", weight: 0.3, anchors: {} },
    { name: "c", description: "", weight: 0.2, anchors: {} },
  ],
};

const baseScores: RubricScoreRow[] = [
  { dimension: "a", score: 4, justification: "j", quote: null, suggestion: "s" },
  { dimension: "b", score: 4, justification: "j", quote: null, suggestion: "s" },
  { dimension: "c", score: 4, justification: "j", quote: null, suggestion: "s" },
];

describe("applyOverrides", () => {
  it("returns unchanged scores when overrides are empty/null/undefined", () => {
    for (const overrides of [null, undefined, [] as never[]]) {
      const result = applyOverrides(baseScores, overrides, rubric);
      expect(result.scores).toEqual(baseScores);
      expect(result.overallScore).toBeCloseTo(4, 5);
      expect(result.pass).toBe(true);
      expect(result.hireReady).toBe(true);
      expect(result.overriddenDimensions.size).toBe(0);
      expect(result.hasOverrides).toBe(false);
    }
  });

  it("applies a single-dimension override and recomputes overall", () => {
    const result = applyOverrides(baseScores, [{ dimension: "a", score: 2 }], rubric);
    // 0.5*2 + 0.3*4 + 0.2*4 = 1 + 1.2 + 0.8 = 3.0
    expect(result.overallScore).toBeCloseTo(3.0, 5);
    expect(result.scores.find((s) => s.dimension === "a")?.score).toBe(2);
    expect(result.overriddenDimensions.has("a")).toBe(true);
    expect(result.hasOverrides).toBe(true);
  });

  it("flips pass=false when any dim drops below pass_threshold", () => {
    const result = applyOverrides(baseScores, [{ dimension: "b", score: 2 }], rubric);
    expect(result.pass).toBe(false);
  });

  it("flips hire_ready=false when overall drops below hire_ready_threshold", () => {
    // override everyone to 3 → overall 3 < 4 → not hire-ready, but pass
    const result = applyOverrides(
      baseScores,
      [
        { dimension: "a", score: 3 },
        { dimension: "b", score: 3 },
        { dimension: "c", score: 3 },
      ],
      rubric
    );
    expect(result.pass).toBe(true);
    expect(result.hireReady).toBe(false);
    expect(result.overallScore).toBeCloseTo(3.0, 5);
    expect(result.overriddenDimensions.size).toBe(3);
  });

  it("ignores overrides for unknown dimensions", () => {
    const result = applyOverrides(baseScores, [{ dimension: "does_not_exist", score: 1 }], rubric);
    expect(result.overriddenDimensions.size).toBe(0);
    expect(result.hasOverrides).toBe(false);
    expect(result.overallScore).toBeCloseTo(4, 5);
  });

  it("does not flag an override that matches the existing score", () => {
    const result = applyOverrides(baseScores, [{ dimension: "a", score: 4 }], rubric);
    expect(result.overriddenDimensions.size).toBe(0);
    expect(result.hasOverrides).toBe(false);
  });
});
