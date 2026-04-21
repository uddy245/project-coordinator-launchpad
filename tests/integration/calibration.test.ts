import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseRubric } from "@/lib/grading/rubric";
import { gradeWithContext } from "@/lib/grading/service";

// Integration: exercises the real Anthropic API. Skipped unless
// RUN_CALIBRATION=1 is set. Default `pnpm test` and the main CI
// workflow both leave it unset so this costs nothing by default.
// Enable via: RUN_CALIBRATION=1 pnpm vitest run tests/integration/calibration.test.ts
const shouldRun = process.env.RUN_CALIBRATION === "1" && !!process.env.ANTHROPIC_API_KEY;
const describeIf = shouldRun ? describe : describe.skip;

const REPO_ROOT = join(__dirname, "..", "..");
const FIXTURES_ROOT = join(__dirname, "..", "fixtures");

/**
 * One entry per competency. Add a new line per new lesson that
 * introduces a new competency. Rubric files live in docs/rubrics/;
 * prompt files live in docs/prompts/. The fixture directory under
 * tests/fixtures/<competency>/ holds one folder per fixture with
 * submission.txt + expected.json.
 *
 * This small config survives until we either (a) ship a second
 * competency and want to auto-discover, or (b) move calibration
 * metadata into the DB. For now: explicit beats clever.
 */
const COMPETENCIES: Array<{
  competency: string;
  rubricPath: string;
  promptPath: string;
}> = [
  {
    competency: "risk_identification",
    rubricPath: "docs/rubrics/raid-v1.json",
    promptPath: "docs/prompts/grade-raid-v1.md",
  },
];

type ExpectedDimensionScore = { score: number; tolerance: number };

type Expected = {
  fixture_id: string;
  scenario_ref?: string;
  expected_dimension_scores: Record<string, ExpectedDimensionScore>;
  expected_overall_competency_score: number;
  expected_pass: boolean;
  expected_hire_ready: boolean;
  notes_for_human_reviewer?: string;
};

type Fixture = {
  competency: string;
  slug: string;
  submissionText: string;
  expected: Expected;
};

function loadFixturesFor(competency: string): Fixture[] {
  const dir = join(FIXTURES_ROOT, competency);
  const entries = readdirSync(dir)
    .filter((name) => {
      const path = join(dir, name);
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  return entries.map((slug) => {
    const submissionText = readFileSync(join(dir, slug, "submission.txt"), "utf8");
    const expected = JSON.parse(readFileSync(join(dir, slug, "expected.json"), "utf8")) as Expected;
    return { competency, slug, submissionText, expected };
  });
}

describeIf("calibration corpus [hits Anthropic API]", () => {
  // Collected across all fixtures × all competencies for the aggregate.
  const allCells: Array<{
    competency: string;
    fixture: string;
    dim: string;
    expected: number;
    actual: number;
  }> = [];

  for (const { competency, rubricPath, promptPath } of COMPETENCIES) {
    const rubric = parseRubric(JSON.parse(readFileSync(join(REPO_ROOT, rubricPath), "utf8")));
    const promptBody = readFileSync(join(REPO_ROOT, promptPath), "utf8");
    const scenarioText = readFileSync(join(FIXTURES_ROOT, competency, "scenario.txt"), "utf8");
    const fixtures = loadFixturesFor(competency);

    describe(competency, () => {
      for (const fx of fixtures) {
        it(`${fx.slug} — every dim within per-dim tolerance; quotes present for score ≥3`, async () => {
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
            const expected = fx.expected.expected_dimension_scores[dim.dimension];
            expect(expected, `no expected score for ${dim.dimension}`).toBeDefined();
            const diff = Math.abs(dim.score - expected!.score);
            allCells.push({
              competency,
              fixture: fx.slug,
              dim: dim.dimension,
              expected: expected!.score,
              actual: dim.score,
            });
            // Per-dim tolerance lets us tighten floor/ceiling fixtures while
            // leaving room for run-to-run variance on borderline cells.
            expect(
              diff,
              `${competency}/${fx.slug}/${dim.dimension}: expected ${expected!.score} (tol ±${expected!.tolerance}), got ${dim.score} (quote="${dim.quote.slice(0, 80)}")`
            ).toBeLessThanOrEqual(expected!.tolerance);

            if (dim.score >= 3) {
              expect(
                dim.quote.trim().length,
                `${competency}/${fx.slug}/${dim.dimension} scored ${dim.score} but has empty quote`
              ).toBeGreaterThan(0);
            }
          }
          // Claude calls usually take 20–60s; occasional spikes past 120s.
        }, 240_000);
      }
    });
  }

  it("≥80% of all (competency × fixture × dim) cells land within ±1 of expected", () => {
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
