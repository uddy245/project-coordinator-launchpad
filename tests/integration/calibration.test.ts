import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRubric } from "@/lib/grading/rubric";
import { gradeWithContext } from "@/lib/grading/service";

// Integration: exercises the real Anthropic API. Skipped unless
// RUN_CALIBRATION=1 is set. Default `pnpm test` and the main CI
// workflow both leave it unset so this costs nothing by default.
// Enable via: RUN_CALIBRATION=1 pnpm vitest run tests/integration/calibration.test.ts
const shouldRun = process.env.RUN_CALIBRATION === "1" && !!process.env.ANTHROPIC_API_KEY;
const describeIf = shouldRun ? describe : describe.skip;

const FIXTURES_DIR = join(__dirname, "..", "fixtures", "raid-submissions");
const RUBRIC_PATH = join(__dirname, "..", "..", "docs", "rubrics", "raid-v1.json");
const PROMPT_PATH = join(__dirname, "..", "..", "docs", "prompts", "grade-raid-v1.md");

type Expected = {
  label: "novice" | "intermediate" | "hire-ready";
  notes?: string;
  expected_scores: Record<string, number>;
};

type Fixture = {
  slug: string;
  submissionText: string;
  expected: Expected;
};

function loadFixtures(): Fixture[] {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".txt") && f !== "scenario.txt");
  return files.sort().map((file) => {
    const slug = file.replace(/\.txt$/, "");
    const submissionText = readFileSync(join(FIXTURES_DIR, file), "utf8");
    const expected = JSON.parse(
      readFileSync(join(FIXTURES_DIR, `${slug}.expected.json`), "utf8")
    ) as Expected;
    return { slug, submissionText, expected };
  });
}

describeIf("calibration corpus [hits Anthropic API]", () => {
  const rubric = parseRubric(JSON.parse(readFileSync(RUBRIC_PATH, "utf8")));
  const promptBody = readFileSync(PROMPT_PATH, "utf8");
  const scenarioText = readFileSync(join(FIXTURES_DIR, "scenario.txt"), "utf8");
  const fixtures = loadFixtures();

  // Collected across all fixtures for the aggregate assertion.
  const allCells: Array<{ fixture: string; dim: string; expected: number; actual: number }> = [];

  for (const fx of fixtures) {
    it(`${fx.slug} (${fx.expected.label}) — every dim within ±1 of expected; quotes present for score ≥3`, async () => {
      const result = await gradeWithContext({
        rubric,
        promptBody,
        scenarioText,
        submissionText: fx.submissionText,
      });

      expect(result.ok, result.ok ? "" : result.error).toBe(true);
      if (!result.ok) return;

      const { score } = result.data;

      for (const dim of score.dimension_scores) {
        const expected = fx.expected.expected_scores[dim.dimension];
        expect(expected, `no expected score for ${dim.dimension}`).toBeDefined();
        const diff = Math.abs(dim.score - expected!);
        allCells.push({
          fixture: fx.slug,
          dim: dim.dimension,
          expected: expected!,
          actual: dim.score,
        });
        expect(
          diff,
          `${fx.slug}/${dim.dimension}: expected ${expected}, got ${dim.score} (quote="${dim.quote.slice(0, 80)}")`
        ).toBeLessThanOrEqual(1);

        if (dim.score >= 3) {
          expect(
            dim.quote.trim().length,
            `${fx.slug}/${dim.dimension} scored ${dim.score} but has empty quote`
          ).toBeGreaterThan(0);
        }
      }
      // Claude calls usually take 20–60s; occasional spikes past 120s.
    }, 240_000);
  }

  it("≥80% of all (fixture × dim) cells land within ±1 of expected", () => {
    if (allCells.length === 0) return; // previous tests all skipped/failed before recording
    const within = allCells.filter((c) => Math.abs(c.actual - c.expected) <= 1).length;
    const rate = within / allCells.length;

    // Surface the table on failure so regression cause is obvious.
    if (rate < 0.8) {
      console.table(
        allCells.map((c) => ({
          ...c,
          diff: c.actual - c.expected,
          within1: Math.abs(c.actual - c.expected) <= 1,
        }))
      );
    }
    expect(rate, `only ${within}/${allCells.length} cells within ±1`).toBeGreaterThanOrEqual(0.8);
  });
});
