import type { RubricJSON } from "./rubric";
import type { RubricScoreRow } from "@/components/grading/rubric-score-card";

export type OverrideEntry = { dimension: string; score: number };

export type AppliedScores = {
  scores: RubricScoreRow[];
  overallScore: number;
  pass: boolean;
  hireReady: boolean;
  overriddenDimensions: Set<string>;
  hasOverrides: boolean;
};

/**
 * Merge admin overrides into AI rubric scores at display time.
 *
 * Overall / pass / hire_ready are recomputed from the overridden dim
 * scores using the same formula Claude is told to apply
 * (docs/prompts/grade-raid-v1.md):
 *   - overall = weighted average across dimensions
 *   - pass    = every dim score >= rubric.pass_threshold
 *   - hire_ready = overall >= rubric.hire_ready_threshold
 *
 * Unknown dimensions in `overrides` are ignored (defensive).
 */
export function applyOverrides(
  scores: RubricScoreRow[],
  overrides: OverrideEntry[] | null | undefined,
  rubric: RubricJSON
): AppliedScores {
  const rubricDimensionNames = new Set(rubric.dimensions.map((d) => d.name));
  const overrideMap = new Map<string, number>();
  for (const o of overrides ?? []) {
    if (rubricDimensionNames.has(o.dimension)) {
      overrideMap.set(o.dimension, o.score);
    }
  }

  const overriddenDimensions = new Set<string>();
  const merged: RubricScoreRow[] = scores.map((s) => {
    const override = overrideMap.get(s.dimension);
    if (override !== undefined && override !== s.score) {
      overriddenDimensions.add(s.dimension);
      return { ...s, score: override };
    }
    return s;
  });

  const scoreByDim = new Map(merged.map((s) => [s.dimension, s.score]));

  let weightSum = 0;
  let weighted = 0;
  let allAbovePass = true;
  for (const d of rubric.dimensions) {
    const s = scoreByDim.get(d.name);
    if (s === undefined) continue;
    weightSum += d.weight;
    weighted += d.weight * s;
    if (s < rubric.pass_threshold) allAbovePass = false;
  }

  const overallScore = weightSum > 0 ? weighted / weightSum : 0;

  return {
    scores: merged,
    overallScore,
    pass: allAbovePass,
    hireReady: overallScore >= rubric.hire_ready_threshold,
    overriddenDimensions,
    hasOverrides: overriddenDimensions.size > 0,
  };
}
