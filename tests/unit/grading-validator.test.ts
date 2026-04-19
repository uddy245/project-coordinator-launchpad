import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildScoreValidator } from "@/lib/grading/validator";
import { parseRubric } from "@/lib/grading/rubric";

const rubric = parseRubric(
  JSON.parse(readFileSync(resolve(__dirname, "..", "..", "docs/rubrics/raid-v1.json"), "utf8"))
);
const validator = buildScoreValidator(rubric);

function score(over: Partial<{ score: number; quote: string }> = {}) {
  return rubric.dimensions.map((d) => ({
    dimension: d.name,
    score: over.score ?? 4,
    justification: "Solid — covers owner, impact, likelihood consistently.",
    quote: over.quote ?? "R-001: Vendor deprecation; Owner: Integration Architect",
    suggestion: "Add follow-up date to R-003 and R-004.",
  }));
}

describe("buildScoreValidator", () => {
  it("accepts a well-formed tool output", () => {
    const result = validator.safeParse({
      dimension_scores: score(),
      overall_competency_score: 4.0,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown dimension name", () => {
    const scores = score();
    scores[0]!.dimension = "made_up_dimension";
    const result = validator.safeParse({
      dimension_scores: scores,
      overall_competency_score: 4,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate dimensions", () => {
    const scores = score();
    scores[1]!.dimension = scores[0]!.dimension;
    const result = validator.safeParse({
      dimension_scores: scores,
      overall_competency_score: 4,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing dimension (wrong length)", () => {
    const scores = score().slice(0, rubric.dimensions.length - 1);
    const result = validator.safeParse({
      dimension_scores: scores,
      overall_competency_score: 4,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score out of [1,5]", () => {
    const result = validator.safeParse({
      dimension_scores: score({ score: 6 }),
      overall_competency_score: 4,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires quote when score >= 3", () => {
    const result = validator.safeParse({
      dimension_scores: score({ score: 4, quote: "" }),
      overall_competency_score: 4,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });

  it("allows empty quote when score < 3", () => {
    const result = validator.safeParse({
      dimension_scores: score({ score: 2, quote: "" }),
      overall_competency_score: 2,
      pass: false,
      hire_ready: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects overall_competency_score out of [1,5]", () => {
    const result = validator.safeParse({
      dimension_scores: score(),
      overall_competency_score: 5.5,
      pass: true,
      hire_ready: false,
    });
    expect(result.success).toBe(false);
  });
});
