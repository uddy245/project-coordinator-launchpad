import type Anthropic from "@anthropic-ai/sdk";
import type { RubricJSON } from "./rubric";

export const GRADE_TOOL_NAME = "record_rubric_scores";

/**
 * Build the Anthropic tool definition that forces Claude to emit a
 * structured score object. The `dimension` field's enum is derived
 * from the rubric so a typo in the rubric JSON propagates to the
 * tool schema and any malformed Claude response is caught by the
 * validator rather than silently writing mislabeled scores.
 */
export function buildGradeTool(rubric: RubricJSON): Anthropic.Messages.Tool {
  const dimensionNames = rubric.dimensions.map((d) => d.name);

  return {
    name: GRADE_TOOL_NAME,
    description: "Record the rubric scores for this submission. Must be called exactly once.",
    input_schema: {
      type: "object",
      required: ["dimension_scores", "overall_competency_score", "pass", "hire_ready"],
      properties: {
        dimension_scores: {
          type: "array",
          minItems: dimensionNames.length,
          maxItems: dimensionNames.length,
          items: {
            type: "object",
            required: ["dimension", "score", "justification", "quote", "suggestion"],
            properties: {
              dimension: {
                type: "string",
                enum: dimensionNames,
              },
              score: { type: "integer", minimum: 1, maximum: 5 },
              justification: {
                type: "string",
                minLength: 10,
                maxLength: 500,
              },
              quote: { type: "string", maxLength: 500 },
              suggestion: {
                type: "string",
                minLength: 10,
                maxLength: 300,
              },
            },
          },
        },
        overall_competency_score: {
          type: "number",
          minimum: 1,
          maximum: 5,
        },
        pass: { type: "boolean" },
        hire_ready: { type: "boolean" },
      },
    },
  };
}
