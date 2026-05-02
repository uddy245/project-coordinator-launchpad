"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateInterviewScenarios,
  type GeneratedScenario,
} from "@/lib/interviews/generate";
import type { ActionResult } from "@/lib/types";

const RefreshSchema = z.object({
  // Optional steers — none required, defaults work for the common case.
  competency: z.string().trim().max(80).optional(),
  category: z.enum(["behavioural", "procedural", "judgment"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  count: z.number().int().min(1).max(5).default(3),
});

export type RefreshScenariosInput = z.input<typeof RefreshSchema>;

export type RefreshScenariosData = {
  generated: GeneratedScenario[];
};

/**
 * Generate N new mock-interview scenarios. Available to any signed-in
 * learner — generation cost is bounded by the existing daily Anthropic
 * spend cap, and generated scenarios join the global pool so all
 * learners benefit from any single user's refresh.
 */
export async function generateMoreScenarios(
  input: RefreshScenariosInput = {},
): Promise<ActionResult<RefreshScenariosData>> {
  const parsed = RefreshSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    const generated = await generateInterviewScenarios({
      count: parsed.data.count,
      competency: parsed.data.competency,
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
    });
    revalidatePath("/interviews");
    return { ok: true, data: { generated } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Generation failed",
      code: "GENERATION_FAILED",
    };
  }
}
