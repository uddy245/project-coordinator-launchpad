import { describe, it, expect } from "vitest";
import { computeGateSummary } from "@/lib/gates/compute";

describe("computeGateSummary", () => {
  it("returns pending portfolio status with zero count when row is null", () => {
    const s = computeGateSummary(null);
    expect(s.portfolio.status).toBe("pending");
    expect(s.portfolio.detail).toMatch(/0 of 7/);
  });

  it("flips portfolio to in_progress when any artifact submitted", () => {
    const s = computeGateSummary({
      foundation_complete: false,
      portfolio_complete: false,
      portfolio_artifacts_count: 1,
      portfolio_artifacts_target: 7,
      interview_complete: false,
      industry_complete: false,
    });
    expect(s.portfolio.status).toBe("in_progress");
    expect(s.portfolio.detail).toMatch(/1 of 7/);
  });

  it("flips portfolio to complete when count meets target", () => {
    const s = computeGateSummary({
      foundation_complete: false,
      portfolio_complete: false,
      portfolio_artifacts_count: 7,
      portfolio_artifacts_target: 7,
      interview_complete: false,
      industry_complete: false,
    });
    expect(s.portfolio.status).toBe("complete");
  });

  it("handles a custom target", () => {
    const s = computeGateSummary({
      foundation_complete: false,
      portfolio_complete: false,
      portfolio_artifacts_count: 5,
      portfolio_artifacts_target: 5,
      interview_complete: false,
      industry_complete: false,
    });
    expect(s.portfolio.status).toBe("complete");
    expect(s.portfolio.detail).toMatch(/5 of 5/);
  });

  it("keeps gates 1/3/4 as coming_soon in MVP regardless of flags", () => {
    const s = computeGateSummary({
      foundation_complete: true,
      portfolio_complete: true,
      portfolio_artifacts_count: 7,
      portfolio_artifacts_target: 7,
      interview_complete: true,
      industry_complete: true,
    });
    expect(s.foundation).toBe("coming_soon");
    expect(s.interview).toBe("coming_soon");
    expect(s.industry).toBe("coming_soon");
  });
});
