import { z } from "zod";

export const DimensionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0).max(1),
  anchors: z.record(z.string(), z.string()),
});

export const RubricSchema = z.object({
  rubric_id: z.string().min(1),
  rubric_version: z.string().min(1),
  competency: z.string().min(1),
  competency_label: z.string().optional(),
  pass_threshold: z.number().min(1).max(5).default(3),
  hire_ready_threshold: z.number().min(1).max(5).default(4),
  dimensions: z.array(DimensionSchema).min(1),
});

export type RubricJSON = z.infer<typeof RubricSchema>;
export type RubricDimension = z.infer<typeof DimensionSchema>;

/**
 * Narrow the loose jsonb shape coming back from the rubrics table into
 * a typed rubric. Throws if the JSON violates the schema — that's a
 * bug (malformed seed) and should fail loud, not be retry-able.
 */
export function parseRubric(raw: unknown): RubricJSON {
  return RubricSchema.parse(raw);
}
