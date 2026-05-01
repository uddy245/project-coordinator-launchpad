import { renderLayout, appUrl, type LayoutBlock } from "../layout";
import type { EmailRender } from "../send";

export type WeeklyDigestVars = {
  firstName: string | null;
  /** Active days in the past week (e.g. days where any progress event was logged) */
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompletedThisWeek: number;
  lessonsCompletedTotal: number;
  /** Slug of the module we suggest opening next */
  nextLessonSlug: string | null;
  nextLessonTitle: string | null;
  nextLessonNumber: number | null;
};

export function renderWeeklyDigest(vars: WeeklyDigestVars): EmailRender {
  const greeting = vars.firstName
    ? `${vars.firstName} — your week in PROG·PC·25.`
    : "Your week in PROG·PC·25.";

  const blocks: LayoutBlock[] = [
    {
      type: "p",
      text:
        vars.activeDays === 0
          ? "Quiet week. No pressure — but the most reliable predictor of getting through the programme is showing up for ten minutes, not for an hour. Tomorrow is fine."
          : `You showed up on ${vars.activeDays} of the last 7 days. The streak is the work — keep going.`,
    },
    { type: "h", text: "This week, in numbers" },
    { type: "fact", label: "Active days", value: `${vars.activeDays} / 7` },
    { type: "fact", label: "Current streak", value: `${vars.currentStreak} day${vars.currentStreak === 1 ? "" : "s"}` },
    { type: "fact", label: "Longest streak", value: `${vars.longestStreak} day${vars.longestStreak === 1 ? "" : "s"}` },
    { type: "fact", label: "Lessons completed", value: `${vars.lessonsCompletedThisWeek} this week · ${vars.lessonsCompletedTotal} total` },
  ];

  if (vars.nextLessonSlug && vars.nextLessonTitle) {
    blocks.push({ type: "rule" });
    blocks.push({ type: "h", text: "Suggested next" });
    if (vars.nextLessonNumber) {
      blocks.push({
        type: "p",
        text: `M${String(vars.nextLessonNumber).padStart(2, "0")} — ${vars.nextLessonTitle}`,
      });
    } else {
      blocks.push({ type: "p", text: vars.nextLessonTitle });
    }
    blocks.push({
      type: "cta",
      label: "Open this module →",
      url: `${appUrl()}/lessons/${vars.nextLessonSlug}`,
    });
  } else {
    blocks.push({
      type: "p",
      text: "You're caught up on what's published. New modules drop as we record them.",
    });
    blocks.push({ type: "cta", label: "Visit the dashboard →", url: `${appUrl()}/dashboard` });
  }

  const { html, text } = renderLayout({
    preheader: `${vars.activeDays}/7 active days · streak ${vars.currentStreak}`,
    kicker: "WEEKLY DIGEST",
    title: greeting,
    blocks,
    signoff: "— The Launchpad team",
  });

  return {
    subject:
      vars.activeDays === 0
        ? "Your weekly Launchpad digest — restart whenever you're ready"
        : `Your weekly Launchpad digest — ${vars.activeDays}/7 active`,
    html,
    text,
  };
}
