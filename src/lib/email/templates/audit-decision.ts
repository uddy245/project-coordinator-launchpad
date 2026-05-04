import { renderLayout, appUrl, type LayoutBlock } from "../layout";
import type { EmailRender } from "../send";

export type AuditDecisionVars = {
  firstName: string | null;
  lessonTitle: string;
  submissionId: string;
  /** Overall score before the override, 0..1. */
  oldScore: number;
  /** Overall score after the override, 0..1. */
  newScore: number;
  /** "approved" if no change; "revised" if scores moved. */
  outcome: "approved" | "revised";
  /** Short admin-supplied note explaining the decision. */
  reviewerNote: string | null;
};

export function renderAuditDecision(vars: AuditDecisionVars): EmailRender {
  const oldPct = Math.round(vars.oldScore * 100);
  const newPct = Math.round(vars.newScore * 100);
  const delta = newPct - oldPct;
  const greeting =
    vars.outcome === "approved"
      ? vars.firstName
        ? `${vars.firstName} — your ${vars.lessonTitle} grade was reviewed and confirmed.`
        : `Your ${vars.lessonTitle} grade was reviewed and confirmed.`
      : vars.firstName
        ? `${vars.firstName} — your ${vars.lessonTitle} grade was revised.`
        : `Your ${vars.lessonTitle} grade was revised.`;

  const blocks: LayoutBlock[] = [
    {
      type: "p",
      text:
        vars.outcome === "approved"
          ? "An admin reviewed your submission and confirmed the AI grader's assessment. No change to your score."
          : "An admin reviewed your submission and adjusted one or more dimension scores. Your overall mark has changed.",
    },
    { type: "rule" },
    { type: "fact", label: "Module", value: vars.lessonTitle },
    { type: "fact", label: "Original", value: `${oldPct} / 100` },
    {
      type: "fact",
      label: vars.outcome === "approved" ? "Confirmed at" : "Revised to",
      value:
        vars.outcome === "approved"
          ? `${newPct} / 100`
          : `${newPct} / 100  (${delta > 0 ? "+" : ""}${delta})`,
    },
  ];

  if (vars.reviewerNote) {
    blocks.push({ type: "rule" });
    blocks.push({ type: "h", text: "Reviewer note" });
    blocks.push({ type: "p", text: vars.reviewerNote });
  }

  blocks.push({ type: "rule" });
  blocks.push({
    type: "cta",
    label: "View submission →",
    url: `${appUrl()}/submissions/${vars.submissionId}`,
  });

  const { html, text } = renderLayout({
    preheader:
      vars.outcome === "approved"
        ? `Reviewed — ${newPct}/100 confirmed`
        : `Reviewed — ${oldPct} → ${newPct} (${delta > 0 ? "+" : ""}${delta})`,
    kicker: vars.outcome === "approved" ? "REVIEW · CONFIRMED" : "REVIEW · REVISED",
    title: greeting,
    blocks,
    signoff: "— The Launchpad team",
  });

  return {
    subject:
      vars.outcome === "approved"
        ? `Review complete — ${vars.lessonTitle} confirmed at ${newPct}/100`
        : `Review complete — ${vars.lessonTitle} revised to ${newPct}/100`,
    html,
    text,
  };
}
