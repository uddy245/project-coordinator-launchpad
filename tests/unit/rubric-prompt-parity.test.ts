/**
 * GRADE-002 — guard against rubric/prompt drift.
 *
 * The on-disk docs/rubrics/raid-v1.json and docs/prompts/grade-raid-v1.md
 * are the source of truth for the grading service. If someone edits one
 * without bumping the version + reseeding the DB, this test fails so CI
 * catches it before prod.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

describe("rubric + prompt parity", () => {
  it("rubric JSON is valid and has 5 weighted dimensions summing to 1.0", () => {
    const raw = readFileSync(resolve(ROOT, "docs/rubrics/raid-v1.json"), "utf8");
    const rubric = JSON.parse(raw) as {
      competency: string;
      dimensions: { name: string; weight: number; anchors: Record<string, string> }[];
    };

    expect(rubric.competency).toBe("risk_identification");
    expect(rubric.dimensions).toHaveLength(5);

    const sum = rubric.dimensions.reduce((a, d) => a + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 4);

    for (const d of rubric.dimensions) {
      expect(typeof d.name).toBe("string");
      expect(d.name.length).toBeGreaterThan(0);
      expect(typeof d.anchors["1"]).toBe("string");
      expect(typeof d.anchors["3"]).toBe("string");
      expect(typeof d.anchors["5"]).toBe("string");
    }
  });

  it("grading prompt contains the three interpolation placeholders", () => {
    const text = readFileSync(resolve(ROOT, "docs/prompts/grade-raid-v1.md"), "utf8");
    expect(text).toContain("{{rubric_json}}");
    expect(text).toContain("{{scenario_text}}");
    expect(text).toContain("{{submission_text}}");
  });

  it("grading prompt declares the record_rubric_scores tool contract", () => {
    const text = readFileSync(resolve(ROOT, "docs/prompts/grade-raid-v1.md"), "utf8");
    expect(text).toMatch(/record_rubric_scores/);
    expect(text).toMatch(/dimension_scores/);
    expect(text).toMatch(/overall_competency_score/);
    expect(text).toMatch(/hire_ready/);
  });
});
