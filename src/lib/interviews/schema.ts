/**
 * Shared Zod schema for mock-interview scenarios. Used by:
 *   - admin-scenarios.upsertScenario (admin-authored)
 *   - interviews/generate.ts (Claude-generated)
 * so admin and AI go through identical validation.
 */

import { z } from "zod";

// The canonical spelling across the codebase is the British "behavioural"
// and "judgment" (US). Claude's training data leans toward the American
// "behavioral" — and arguing with the model is a losing battle, so we
// preprocess the input to normalise common spelling variants before the
// enum check. Same logic accommodates "judgement" if it ever shows up.
const CategoryEnum = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim().toLowerCase();
    if (t === "behavioral") return "behavioural";
    if (t === "judgement") return "judgment";
    return t;
  },
  z.enum(["behavioural", "procedural", "judgment"])
);

export const ScenarioSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  prompt: z.string().trim().min(20).max(4000),
  category: CategoryEnum,
  difficulty: z.enum(["easy", "medium", "hard"]),
  competency: z.string().trim().min(1).max(80),
  sort: z.number().int().min(0).max(9999),
  is_published: z.boolean(),
  rubric_summary: z.string().trim().max(2000).optional().nullable(),
});

export type ScenarioInput = z.infer<typeof ScenarioSchema>;
