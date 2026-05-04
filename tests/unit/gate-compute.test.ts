import { describe, it, expect } from "vitest";
import { computeGateSummary, FOUNDATION_SLUGS } from "@/lib/gates/compute";

const STATUS_ROW_EMPTY = {
  foundation_complete: false,
  portfolio_complete: false,
  portfolio_artifacts_count: 0,
  portfolio_artifacts_target: 7,
  interview_complete: false,
  industry_complete: false,
};

function row(extras: Partial<typeof STATUS_ROW_EMPTY> = {}) {
  return { ...STATUS_ROW_EMPTY, ...extras };
}

const FULL_PROGRESS = {
  video_watched: true,
  quiz_passed: true,
  artifact_submitted: true,
};

const PARTIAL_PROGRESS = {
  video_watched: true,
  quiz_passed: false,
  artifact_submitted: false,
};

describe("computeGateSummary — portfolio (Gate 2)", () => {
  it("returns pending portfolio status with zero count when row is null", () => {
    const s = computeGateSummary(null);
    expect(s.portfolio.status).toBe("pending");
    expect(s.portfolio.detail).toMatch(/0 of 7/);
  });

  it("flips portfolio to in_progress when any artifact submitted", () => {
    const s = computeGateSummary(row({ portfolio_artifacts_count: 1 }));
    expect(s.portfolio.status).toBe("in_progress");
    expect(s.portfolio.detail).toMatch(/1 of 7/);
  });

  it("flips portfolio to complete when count meets target", () => {
    const s = computeGateSummary(row({ portfolio_artifacts_count: 7 }));
    expect(s.portfolio.status).toBe("complete");
  });

  it("handles a custom target", () => {
    const s = computeGateSummary(
      row({ portfolio_artifacts_count: 5, portfolio_artifacts_target: 5 })
    );
    expect(s.portfolio.status).toBe("complete");
    expect(s.portfolio.detail).toMatch(/5 of 5/);
  });
});

describe("computeGateSummary — foundation (Gate 1)", () => {
  it("falls back to coming_soon when no foundation progress is provided", () => {
    const s = computeGateSummary(row());
    expect(s.foundation.status).toBe("coming_soon");
    expect(s.foundation.detail).toMatch(/M1–M4/);
  });

  it("is pending when no foundation lessons have been touched", () => {
    const byLessonSlug = new Map(FOUNDATION_SLUGS.map((s) => [s, null]));
    const s = computeGateSummary(row(), { byLessonSlug });
    expect(s.foundation.status).toBe("pending");
    expect(s.foundation.detail).toMatch(/0 of 4/);
  });

  it("is in_progress when at least one lesson is touched but not all complete", () => {
    const byLessonSlug = new Map<string, typeof FULL_PROGRESS | null>([
      ["coordinator-role", FULL_PROGRESS],
      ["project-lifecycle", PARTIAL_PROGRESS],
      ["written-voice", null],
      ["mindset", null],
    ]);
    const s = computeGateSummary(row(), { byLessonSlug });
    expect(s.foundation.status).toBe("in_progress");
    expect(s.foundation.detail).toMatch(/1 of 4/);
  });

  it("is complete only when ALL FOUR foundation lessons are completed (video + quiz)", () => {
    const byLessonSlug = new Map<string, typeof FULL_PROGRESS | null>([
      ["coordinator-role", FULL_PROGRESS],
      ["project-lifecycle", FULL_PROGRESS],
      ["written-voice", FULL_PROGRESS],
      ["mindset", FULL_PROGRESS],
    ]);
    const s = computeGateSummary(row(), { byLessonSlug });
    expect(s.foundation.status).toBe("complete");
    expect(s.foundation.detail).toMatch(/All 4/);
  });

  it("does NOT flip to complete on artifact_submitted alone (foundation gate is video+quiz)", () => {
    // Three completed, one with artifact only — should not yet be complete.
    const byLessonSlug = new Map<string, typeof FULL_PROGRESS | null>([
      ["coordinator-role", FULL_PROGRESS],
      ["project-lifecycle", FULL_PROGRESS],
      ["written-voice", FULL_PROGRESS],
      ["mindset", { video_watched: false, quiz_passed: false, artifact_submitted: true }],
    ]);
    const s = computeGateSummary(row(), { byLessonSlug });
    expect(s.foundation.status).toBe("in_progress");
  });
});

describe("computeGateSummary — interview (Gate 3)", () => {
  it("is coming_soon when no interview progress is provided", () => {
    const s = computeGateSummary(row());
    expect(s.interview.status).toBe("coming_soon");
  });

  it("is coming_soon when total scenarios is 0", () => {
    const s = computeGateSummary(row(), null, { passed: 0, total: 0 });
    expect(s.interview.status).toBe("coming_soon");
  });

  it("is pending when scenarios exist but none passed", () => {
    const s = computeGateSummary(row(), null, { passed: 0, total: 5 });
    expect(s.interview.status).toBe("pending");
    expect(s.interview.detail).toMatch(/5 mock interviews available/);
  });

  it("is in_progress on partial pass", () => {
    const s = computeGateSummary(row(), null, { passed: 3, total: 5 });
    expect(s.interview.status).toBe("in_progress");
    expect(s.interview.detail).toMatch(/3 of 5/);
  });

  it("is complete when all scenarios are passed", () => {
    const s = computeGateSummary(row(), null, { passed: 5, total: 5 });
    expect(s.interview.status).toBe("complete");
  });
});

describe("computeGateSummary — gate 4 (industry)", () => {
  it("keeps gate 4 (industry) as coming_soon regardless of flags", () => {
    const s = computeGateSummary(
      row({
        interview_complete: true,
        industry_complete: true,
      })
    );
    expect(s.industry).toBe("coming_soon");
  });
});
