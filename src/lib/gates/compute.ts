export type GateStatusRow = {
  foundation_complete: boolean;
  portfolio_complete: boolean;
  portfolio_artifacts_count: number;
  portfolio_artifacts_target: number;
  interview_complete: boolean;
  industry_complete: boolean;
};

export type GateSummary = {
  foundation: "coming_soon";
  portfolio: {
    status: "pending" | "in_progress" | "complete";
    detail: string;
  };
  interview: "coming_soon";
  industry: "coming_soon";
};

/**
 * Collapse the raw gate_status row into dashboard-ready summaries.
 * Gates 1, 3, 4 are "coming soon" in MVP; Gate 2 has real semantics
 * driven by portfolio_artifacts_count vs target.
 */
export function computeGateSummary(row: GateStatusRow | null | undefined): GateSummary {
  const count = row?.portfolio_artifacts_count ?? 0;
  const target = row?.portfolio_artifacts_target ?? 7;

  let portfolioStatus: GateSummary["portfolio"]["status"] = "pending";
  if (count >= target) portfolioStatus = "complete";
  else if (count > 0) portfolioStatus = "in_progress";

  return {
    foundation: "coming_soon",
    portfolio: {
      status: portfolioStatus,
      detail: `${count} of ${target} graded artifacts submitted.`,
    },
    interview: "coming_soon",
    industry: "coming_soon",
  };
}
