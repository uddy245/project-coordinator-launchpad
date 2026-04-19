import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/env";

// Pinned model + version — bumping is a deliberate PR per the calibration
// workflow in BUILD_PLAN.md. Never use `latest` in the grading pipeline.
export const GRADING_MODEL = env.ANTHROPIC_MODEL;
export const GRADING_TEMPERATURE = 0;
export const GRADING_MAX_TOKENS = 2048;

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});
