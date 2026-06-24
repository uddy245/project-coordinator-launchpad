// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GateStatusBadge } from "@/components/dashboard/gate-status-badge";

/**
 * Render-layer coverage for the gate badge. The threshold logic lives in
 * computeGateSummary (tests/unit/gate-compute.test.ts) and the live
 * DB→query path was verified by a reversible E2E flip; this locks the
 * last mile — that each computed status renders the right label + pip
 * variant the dashboard's CSS keys off.
 */
const CASES = [
  { status: "complete", label: "Complete", pip: "completed" },
  { status: "in_progress", label: "In progress", pip: "in_progress" },
  { status: "pending", label: "Pending", pip: "not_started" },
  { status: "coming_soon", label: "Coming soon", pip: "not_started" },
] as const;

describe("GateStatusBadge", () => {
  for (const { status, label, pip } of CASES) {
    it(`renders "${label}" with pip data-status="${pip}" for ${status}`, () => {
      const { container } = render(
        <GateStatusBadge
          name="Gate 2 · Portfolio"
          status={status}
          detail="3 of 7 graded artifacts submitted."
        />
      );
      expect(screen.getByRole("heading", { name: "Gate 2 · Portfolio" })).toBeInTheDocument();
      const badge = container.querySelector(".pip");
      expect(badge).not.toBeNull();
      expect(badge).toHaveAttribute("data-status", pip);
      expect(badge).toHaveTextContent(label);
    });
  }

  it("renders the optional detail line when provided", () => {
    render(
      <GateStatusBadge
        name="Gate 1 · Foundations"
        status="complete"
        detail="All 4 foundation modules complete."
      />
    );
    expect(screen.getByText("All 4 foundation modules complete.")).toBeInTheDocument();
  });

  it("omits the detail line when not provided", () => {
    const { container } = render(
      <GateStatusBadge name="Gate 4 · Industry capstone" status="coming_soon" />
    );
    expect(container.querySelector("p")).toBeNull();
  });
});
