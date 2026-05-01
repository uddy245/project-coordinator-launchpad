/**
 * Shared Zod schema for quiz items. Used by:
 *   - admin-lessons.replaceQuizItems (human-authored bulk paste)
 *   - quiz/generate.ts (Claude-generated items)
 * so admin and AI go through identical validation before hitting quiz_items.
 */

import { z } from "zod";

export const QuizItemSchema = z.object({
  sort: z.number().int().min(1),
  stem: z.string().trim().min(5),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(4),
        text: z.string().min(1),
      }),
    )
    .min(2)
    .max(8),
  correct: z.string().min(1).max(4),
  distractor_rationale: z.record(z.string(), z.string()).default({}),
  competency: z.string().min(1).max(80),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type QuizItemInput = z.infer<typeof QuizItemSchema>;
