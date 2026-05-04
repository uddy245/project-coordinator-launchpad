/**
 * Dashboard-ready gate summaries.
 *
 * Gate 1 (Foundations) is wired against M01–M04 lesson progress: a learner
 * "clears" Gate 1 when all four foundation lessons have video watched AND
 * the quiz passed. Artifact submission is captured by Gate 2 separately.
 *
 * Gates 3 (mock interviews) and 4 (capstone) remain coming-soon stubs
 * until those subsystems ship — see F8/F9 of the parallel-features plan.
 */

import { computeLessonStatus, type LessonProgressRow } from "@/lib/lessons/progress";

export type GateStatusRow = {
  foundation_complete: boolean;
  portfolio_complete: boolean;
  portfolio_artifacts_count: number;
  portfolio_artifacts_target: number;
  interview_complete: boolean;
  industry_complete: boolean;
};

export type GateStatus = "pending" | "in_progress" | "complete" | "coming_soon";

export type FoundationProgress = {
  /**
   * Per-lesson progress rows for the four foundation lessons, keyed by
   * slug. A missing/null entry counts as "not started" — same as if
   * the row didn't exist.
   */
  byLessonSlug: Map<string, LessonProgressRow | null>;
};

export type InterviewProgress = {
  /** Number of mock-interview scenarios passed by the user. */
  passed: number;
  /** Total published mock-interview scenarios. */
  total: number;
};

export type GateSummary = {
  foundation: {
    status: GateStatus;
    detail: string;
  };
  portfolio: {
    status: "pending" | "in_progress" | "complete";
    detail: string;
  };
  interview: {
    status: GateStatus;
    detail: string;
  };
  industry: GateStatus;
};

// The four foundation modules. Order matters for the detail string.
export const FOUNDATION_SLUGS = [
  "coordinator-role", // M01
  "project-lifecycle", // M02
  "written-voice", // M03
  "mindset", // M04
] as const;

const FOUNDATION_TOTAL = FOUNDATION_SLUGS.length;

/**
 * Collapse the gate_status row + (optional) foundation progress into the
 * dashboard's display model.
 *
 * - `row` is the per-user gate_status row from Postgres. May be null.
 * - `foundation` is per-lesson progress for M01–M04. When omitted, Gate 1
 *   falls back to "coming_soon" — preserves the historical contract for
 *   callers that haven't been updated yet.
 */
export function computeGateSummary(
  row: GateStatusRow | null | undefined,
  foundation?: FoundationProgress | null,
  interview?: InterviewProgress | null
): GateSummary {
  const count = row?.portfolio_artifacts_count ?? 0;
  const target = row?.portfolio_artifacts_target ?? 7;

  let portfolioStatus: GateSummary["portfolio"]["status"] = "pending";
  if (count >= target) portfolioStatus = "complete";
  else if (count > 0) portfolioStatus = "in_progress";

  return {
    foundation: computeFoundation(foundation),
    portfolio: {
      status: portfolioStatus,
      detail: `${count} of ${target} graded artifacts submitted.`,
    },
    interview: computeInterview(interview),
    industry: "coming_soon",
  };
}

function computeInterview(
  interview: InterviewProgress | null | undefined
): GateSummary["interview"] {
  if (!interview || interview.total === 0) {
    return {
      status: "coming_soon",
      detail: "Mock interviews are part of the next release.",
    };
  }
  if (interview.passed >= interview.total) {
    return {
      status: "complete",
      detail: `All ${interview.total} mock interviews passed.`,
    };
  }
  if (interview.passed > 0) {
    return {
      status: "in_progress",
      detail: `${interview.passed} of ${interview.total} mock interviews passed.`,
    };
  }
  return {
    status: "pending",
    detail: `${interview.total} mock interviews available — none passed yet.`,
  };
}

function computeFoundation(
  foundation: FoundationProgress | null | undefined
): GateSummary["foundation"] {
  if (!foundation) {
    return {
      status: "coming_soon",
      detail: "Unlocked once the full M1–M4 track ships.",
    };
  }

  let completedLessons = 0;
  let touchedLessons = 0;
  for (const slug of FOUNDATION_SLUGS) {
    const row = foundation.byLessonSlug.get(slug) ?? null;
    const status = computeLessonStatus(row);
    if (status === "completed") completedLessons += 1;
    if (status !== "not_started") touchedLessons += 1;
  }

  if (completedLessons >= FOUNDATION_TOTAL) {
    return {
      status: "complete",
      detail: `All ${FOUNDATION_TOTAL} foundation modules complete.`,
    };
  }
  if (touchedLessons === 0) {
    return {
      status: "pending",
      detail: `${completedLessons} of ${FOUNDATION_TOTAL} foundation modules complete.`,
    };
  }
  return {
    status: "in_progress",
    detail: `${completedLessons} of ${FOUNDATION_TOTAL} foundation modules complete.`,
  };
}
