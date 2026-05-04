import { describe, expect, it, vi } from "vitest";

// Email templates only need NEXT_PUBLIC_APP_URL (for dashboard / submission
// links) and the from-address default. Mock the env module to avoid
// requiring the full .env.local load in the test environment.
vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    RESEND_FROM_EMAIL: "Launchpad <onboarding@resend.dev>",
    RESEND_API_KEY: undefined,
  },
}));

import { renderWelcome } from "@/lib/email/templates/welcome";
import { renderPurchaseConfirmed } from "@/lib/email/templates/purchase-confirmed";
import { renderGradingComplete } from "@/lib/email/templates/grading-complete";
import { renderAuditDecision } from "@/lib/email/templates/audit-decision";

describe("email/templates", () => {
  describe("welcome", () => {
    it("greets by first name when provided", () => {
      const r = renderWelcome({ firstName: "Maya" });
      expect(r.subject).toMatch(/welcome.*module 01/i);
      expect(r.html).toContain("Welcome, Maya.");
      expect(r.text).toContain("Welcome, Maya.");
    });

    it("falls back to a neutral greeting when name is null", () => {
      const r = renderWelcome({ firstName: null });
      expect(r.html).toContain("Welcome.");
      expect(r.text).toContain("Welcome.");
    });

    it("includes a link to module 01", () => {
      const r = renderWelcome({ firstName: null });
      expect(r.html).toContain("/lessons/coordinator-role");
      expect(r.text).toContain("/lessons/coordinator-role");
    });
  });

  describe("purchase-confirmed", () => {
    it("renders the amount and includes a receipt link when present", () => {
      const r = renderPurchaseConfirmed({
        firstName: "Sam",
        amountUsd: 749,
        receiptUrl: "https://stripe.example/r/abc",
      });
      expect(r.subject).toMatch(/payment confirmed/i);
      expect(r.html).toContain("$749.00");
      expect(r.html).toContain("https://stripe.example/r/abc");
      expect(r.text).toContain("Sam, you're in.");
    });

    it("omits the receipt block when no URL is provided", () => {
      const r = renderPurchaseConfirmed({
        firstName: null,
        amountUsd: 749,
        receiptUrl: null,
      });
      expect(r.html).not.toContain("View receipt");
      expect(r.text).not.toContain("View receipt");
    });
  });

  describe("grading-complete", () => {
    it("uses HIRE-READY kicker and converts overall score", () => {
      const r = renderGradingComplete({
        firstName: "Priya",
        lessonTitle: "RAID Logs",
        lessonSlug: "raid-logs",
        submissionId: "sub-123",
        overallScore: 0.9,
        passed: true,
        hireReady: true,
        summary: "Strong work all round.",
      });
      expect(r.subject).toContain("Hire-ready — RAID Logs (90/100)");
      expect(r.html).toContain("HIRE-READY");
      expect(r.html).toContain("/submissions/sub-123");
    });

    it("uses NEEDS REVISION when not passed", () => {
      const r = renderGradingComplete({
        firstName: null,
        lessonTitle: "RAID Logs",
        lessonSlug: "raid-logs",
        submissionId: "sub-456",
        overallScore: 0.4,
        passed: false,
        hireReady: false,
        summary: "Specifity dimension was thin.",
      });
      expect(r.subject).toContain("Needs revision — RAID Logs (40/100)");
      expect(r.html).toContain("NEEDS REVISION");
    });
  });

  describe("audit-decision", () => {
    it("renders 'confirmed' when no score change", () => {
      const r = renderAuditDecision({
        firstName: "Lin",
        lessonTitle: "RAID Logs",
        submissionId: "sub-1",
        oldScore: 0.7,
        newScore: 0.7,
        outcome: "approved",
        reviewerNote: "Looks good.",
      });
      expect(r.subject).toMatch(/confirmed at 70\/100/i);
      expect(r.html).toContain("REVIEW · CONFIRMED");
      expect(r.html).toContain("Looks good.");
    });

    it("shows the delta when revised down", () => {
      const r = renderAuditDecision({
        firstName: null,
        lessonTitle: "RAID Logs",
        submissionId: "sub-2",
        oldScore: 0.8,
        newScore: 0.65,
        outcome: "revised",
        reviewerNote: null,
      });
      expect(r.subject).toMatch(/revised to 65\/100/i);
      expect(r.html).toContain("REVIEW · REVISED");
      // 65 - 80 = -15
      expect(r.html).toContain("-15");
    });

    it("shows the delta when revised up", () => {
      const r = renderAuditDecision({
        firstName: null,
        lessonTitle: "Status Reports",
        submissionId: "sub-3",
        oldScore: 0.5,
        newScore: 0.75,
        outcome: "revised",
        reviewerNote: null,
      });
      expect(r.html).toContain("+25");
    });

    it("escapes HTML in the reviewer note (defence-in-depth)", () => {
      const r = renderAuditDecision({
        firstName: "Ana",
        lessonTitle: "Status Reports",
        submissionId: "sub-4",
        oldScore: 0.7,
        newScore: 0.7,
        outcome: "approved",
        reviewerNote: "<script>alert('x')</script>",
      });
      expect(r.html).not.toContain("<script>alert");
      expect(r.html).toContain("&lt;script&gt;alert");
    });
  });
});
