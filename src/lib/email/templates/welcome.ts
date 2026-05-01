import { renderLayout, appUrl, type LayoutBlock } from "../layout";
import type { EmailRender } from "../send";

export type WelcomeVars = {
  firstName: string | null;
};

export function renderWelcome(vars: WelcomeVars): EmailRender {
  const greeting = vars.firstName ? `Welcome, ${vars.firstName}.` : "Welcome.";

  const blocks: LayoutBlock[] = [
    { type: "p", text: "You're enrolled in PROG·PC·25 — the Project Coordinator Launchpad." },
    {
      type: "p",
      text: "The programme is twenty-five modules long and self-paced. Each module pairs a 12-minute video with a companion reading, a 20-question quiz, and a real workbook artifact you submit for AI-grading against a rubric.",
    },
    { type: "h", text: "Your next move" },
    {
      type: "p",
      text: "Module 01 — \"What a Project Coordinator Actually Does\" — is the place to start. About 45 minutes end-to-end including the quiz.",
    },
    { type: "cta", label: "Open Module 01 →", url: `${appUrl()}/lessons/coordinator-role` },
    { type: "rule" },
    { type: "h", text: "What unlocks as you go" },
    { type: "fact", label: "Gate 1", value: "Foundations — M01–M04 complete" },
    { type: "fact", label: "Gate 2", value: "Portfolio — 7 graded artifacts submitted" },
    { type: "fact", label: "Gate 3", value: "Mock interviews" },
    { type: "fact", label: "Gate 4", value: "Industry capstone — hire-ready" },
  ];

  const { html, text } = renderLayout({
    preheader: "You're enrolled. Module 01 is the place to start.",
    kicker: "ENROLMENT CONFIRMED",
    title: greeting,
    blocks,
    signoff: "— The Launchpad team",
  });

  return { subject: "Welcome to PROG·PC·25 — start with Module 01", html, text };
}
