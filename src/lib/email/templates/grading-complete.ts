import { renderLayout, appUrl, type LayoutBlock } from "../layout";
import type { EmailRender } from "../send";

export type GradingCompleteVars = {
  firstName: string | null;
  lessonTitle: string;
  lessonSlug: string;
  submissionId: string;
  overallScore: number; // 0..1 normalised
  passed: boolean;
  hireReady: boolean;
  /** Top-line feedback summary from the grader (1–2 sentences). */
  summary: string;
};

export function renderGradingComplete(vars: GradingCompleteVars): EmailRender {
  const score = Math.round(vars.overallScore * 100);
  const verdict = vars.hireReady
    ? "Hire-ready"
    : vars.passed
      ? "Passed"
      : "Needs revision";
  const verdictKicker = vars.hireReady
    ? "HIRE-READY"
    : vars.passed
      ? "PASSED"
      : "NEEDS REVISION";

  const greeting = vars.firstName
    ? `${vars.firstName} — your ${vars.lessonTitle} artifact has been graded.`
    : `Your ${vars.lessonTitle} artifact has been graded.`;

  const blocks: LayoutBlock[] = [
    { type: "p", text: vars.summary },
    { type: "rule" },
    { type: "fact", label: "Module", value: vars.lessonTitle },
    { type: "fact", label: "Overall score", value: `${score} / 100` },
    { type: "fact", label: "Verdict", value: verdict },
    { type: "rule" },
    {
      type: "p",
      text: vars.passed
        ? "Open the submission to see your per-dimension breakdown and the grader's notes. If anything looks off, you can request a human review and an admin will look at it within 48 hours."
        : "The detailed dimension-by-dimension feedback is on the submission page. The most useful next step is to read the per-dimension comments, revise, and resubmit — there's no penalty for resubmission.",
    },
    {
      type: "cta",
      label: "View graded submission →",
      url: `${appUrl()}/submissions/${vars.submissionId}`,
    },
  ];

  const { html, text } = renderLayout({
    preheader: `${verdict} — ${score}/100 on ${vars.lessonTitle}`,
    kicker: verdictKicker,
    title: greeting,
    blocks,
    signoff: "— The Launchpad team",
  });

  return {
    subject: `${verdict} — ${vars.lessonTitle} (${score}/100)`,
    html,
    text,
  };
}
