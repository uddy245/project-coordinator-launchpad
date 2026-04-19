// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RubricScoreCard, type RubricScoreRow } from "@/components/grading/rubric-score-card";
import type { RubricJSON } from "@/lib/grading/rubric";

const rubric: RubricJSON = {
  rubric_id: "raid-v1",
  rubric_version: "1.0.0",
  competency: "risk_identification",
  competency_label: "RAID Log Discipline",
  pass_threshold: 3,
  hire_ready_threshold: 4,
  dimensions: [
    {
      name: "risk_completeness",
      description: "Do risks have trigger, impact, likelihood, owner, mitigation?",
      weight: 0.5,
      anchors: { "1": "Vague.", "3": "Mostly structured.", "5": "All fields filled." },
    },
    {
      name: "risk_differentiation",
      description: "Risk vs Issue vs Assumption vs Dependency.",
      weight: 0.5,
      anchors: { "1": "Mislabeled.", "3": "Mostly correct.", "5": "Crisp." },
    },
  ],
};

const baseScores: RubricScoreRow[] = [
  {
    dimension: "risk_completeness",
    score: 3,
    justification: "All risks have most fields.",
    quote: "R1 has trigger, impact, owner set",
    suggestion: "Add follow-up dates.",
  },
  {
    dimension: "risk_differentiation",
    score: 4,
    justification: "Categories applied correctly throughout.",
    quote: "R1 Risk; I1 Issue; A1 Assumption",
    suggestion: "None.",
  },
];

describe("RubricScoreCard", () => {
  it("does not show review or override signals by default", () => {
    render(
      <RubricScoreCard
        rubric={rubric}
        scores={baseScores}
        overallScore={3.5}
        pass={true}
        hireReady={false}
      />
    );
    expect(screen.queryByText(/reviewed by human/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/adjusted by reviewer/i)).not.toBeInTheDocument();
  });

  it("shows 'Reviewed by human' badge when reviewedByHuman is true", () => {
    render(
      <RubricScoreCard
        rubric={rubric}
        scores={baseScores}
        overallScore={3.5}
        pass={true}
        hireReady={false}
        reviewedByHuman={true}
      />
    );
    expect(screen.getByText(/reviewed by human/i)).toBeInTheDocument();
  });

  it("tags only the overridden dimensions with 'Adjusted by reviewer'", () => {
    render(
      <RubricScoreCard
        rubric={rubric}
        scores={baseScores}
        overallScore={3.5}
        pass={true}
        hireReady={false}
        overriddenDimensions={new Set(["risk_completeness"])}
        reviewedByHuman={true}
      />
    );
    // One tag, tied to the overridden dim's card.
    const tags = screen.getAllByText(/adjusted by reviewer/i);
    expect(tags).toHaveLength(1);
  });

  it("renders the scored value, not the pre-override value, for each dim", () => {
    // Caller (submission page) is responsible for merging; the card
    // just renders whatever score prop it gets.
    const merged = baseScores.map((s) =>
      s.dimension === "risk_completeness" ? { ...s, score: 1 } : s
    );
    render(
      <RubricScoreCard
        rubric={rubric}
        scores={merged}
        overallScore={2.0}
        pass={false}
        hireReady={false}
        overriddenDimensions={new Set(["risk_completeness"])}
        reviewedByHuman={true}
      />
    );
    expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 5/)).toBeInTheDocument();
    expect(screen.getByText("2.0")).toBeInTheDocument();
  });
});
