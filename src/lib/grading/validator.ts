import { z } from "zod";
import type { RubricJSON } from "./rubric";

/**
 * Dynamic Zod schema for the tool-use output. The set of dimension
 * names is locked to the rubric so Claude cannot invent new dimensions
 * or drop existing ones. Also enforces:
 *   - scores in [1, 5]
 *   - quote required (and non-empty) when score >= 3, since the
 *     grading prompt explicitly says quotes gate the >=3 scores
 *   - overall_competency_score within [1, 5]
 */
export function buildScoreValidator(rubric: RubricJSON) {
  const dimensionNames = rubric.dimensions.map((d) => d.name) as [string, ...string[]];

  const DimensionScore = z
    .object({
      dimension: z.enum(dimensionNames),
      score: z.number().int().min(1).max(5),
      justification: z.string().min(10).max(500),
      quote: z.string().max(500),
      suggestion: z.string().min(10).max(300),
    })
    .refine((v) => v.score < 3 || v.quote.trim().length > 0, "quote is required when score >= 3");

  const ScoreOutput = z.object({
    dimension_scores: z
      .array(DimensionScore)
      .length(dimensionNames.length)
      .refine(
        (arr) => new Set(arr.map((d) => d.dimension)).size === arr.length,
        "dimension_scores must have one entry per dimension, no duplicates"
      )
      .refine(
        (arr) => dimensionNames.every((name) => arr.some((d) => d.dimension === name)),
        "every dimension in the rubric must be scored"
      ),
    overall_competency_score: z.number().min(1).max(5),
    pass: z.boolean(),
    hire_ready: z.boolean(),
  });

  return ScoreOutput;
}

export type ScoreOutput = z.infer<ReturnType<typeof buildScoreValidator>>;
