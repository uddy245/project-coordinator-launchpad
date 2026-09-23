import { describe, it, expect } from "vitest";
import { humanizeDimension, rubricCriteria } from "@/lib/grading/criteria";
import { RubricSchema } from "@/lib/grading/rubric";

const rubric = RubricSchema.parse({
  rubric_id: "raid-v1",
  rubric_version: "1.0.0",
  competency: "risk_identification",
  dimensions: [
    {
      name: "mitigation_realism",
      weight: 0.2,
      description: "Are mitigations specific?",
      anchors: {},
    },
    {
      name: "risk_completeness",
      weight: 0.3,
      description: " Does each risk have an owner? ",
      anchors: {},
    },
  ],
});

describe("rubricCriteria", () => {
  it("returns plain-language criteria, heaviest first, with % weights", () => {
    expect(rubricCriteria(rubric)).toEqual([
      { label: "Risk completeness", question: "Does each risk have an owner?", weightPct: 30 },
      { label: "Mitigation realism", question: "Are mitigations specific?", weightPct: 20 },
    ]);
  });

  it("humanizes snake_case and kebab-case names", () => {
    expect(humanizeDimension("ownership_and_accountability")).toBe("Ownership and accountability");
    expect(humanizeDimension("five-variable-posture")).toBe("Five variable posture");
  });
});
