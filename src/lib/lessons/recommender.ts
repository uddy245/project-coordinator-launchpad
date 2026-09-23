/**
 * "Next module for you" recommender.
 *
 * Heuristic, not ML — and that's fine. Quality of recommendation comes
 * from picking the right *signal*, not from clever ranking. We have:
 *  - lessons.number      (sequence; the programme is intentionally ordered)
 *  - lesson_progress     (video_watched, quiz_passed, artifact_submitted)
 *  - foundation gate     (M01–M04 special precedence)
 *
 * The rule, in order:
 *  1. If any FOUNDATION lesson (M01–M04) is unfinished, that's the next
 *     one. Foundations are sequenced for a reason.
 *  2. Otherwise, the lowest-numbered published lesson with any
 *     non-completed step (video, quiz, or artifact).
 *  3. Otherwise, the lowest-numbered published lesson the learner hasn't
 *     started at all.
 *  4. Otherwise, null — the learner is fully caught up.
 *
 * The UI presents the recommendation with a one-sentence "why" so the
 * heuristic is legible: "Continue M03 — your quiz is the only step left."
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons as lessonsTable } from "@/db/schema";

const FOUNDATION_SLUGS = ["coordinator-role", "project-lifecycle", "written-voice", "mindset"];

export type LessonRecommendation = {
  lessonId: string;
  slug: string;
  number: number;
  title: string;
  reason: string;
  resumeStep: "video" | "quiz" | "workbook" | "start";
};

type LessonRow = {
  id: string;
  slug: string;
  number: number;
  title: string;
};

type ProgressRow = {
  lesson_id: string;
  video_watched: boolean;
  quiz_passed: boolean;
  artifact_submitted: boolean;
};

function nextStep(p: ProgressRow | undefined): {
  step: LessonRecommendation["resumeStep"];
  reason: string;
} | null {
  if (!p) return { step: "start", reason: "You haven't opened it yet." };
  if (!p.video_watched) return { step: "video", reason: "The video is the next step." };
  if (!p.quiz_passed)
    return { step: "quiz", reason: "The quiz is the only step left to complete this module." };
  if (!p.artifact_submitted)
    return { step: "workbook", reason: "Submit your workbook artifact to close out this module." };
  return null; // fully done
}

export async function recommendNextLesson(userId: string): Promise<LessonRecommendation | null> {
  const [lessons, progress]: [LessonRow[], ProgressRow[]] = await Promise.all([
    db
      .select({
        id: lessonsTable.id,
        slug: lessonsTable.slug,
        number: lessonsTable.number,
        title: lessonsTable.title,
      })
      .from(lessonsTable)
      .where(eq(lessonsTable.isPublished, true))
      .orderBy(lessonsTable.number),
    db
      .select({
        lesson_id: lessonProgress.lessonId,
        video_watched: lessonProgress.videoWatched,
        quiz_passed: lessonProgress.quizPassed,
        artifact_submitted: lessonProgress.artifactSubmitted,
      })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId)),
  ]);
  const progressByLesson = new Map(progress.map((p) => [p.lesson_id, p]));

  // Stage 1 — foundations first.
  const foundationLessons = lessons
    .filter((l) => FOUNDATION_SLUGS.includes(l.slug))
    .sort((a, b) => a.number - b.number);

  for (const l of foundationLessons) {
    const step = nextStep(progressByLesson.get(l.id));
    if (step) {
      return {
        lessonId: l.id,
        slug: l.slug,
        number: l.number,
        title: l.title,
        reason:
          step.step === "start"
            ? "Start with Foundations — Module 01 is the place to begin."
            : `Foundations — ${step.reason}`,
        resumeStep: step.step,
      };
    }
  }

  // Stage 2 — any partially-started lesson, lowest number first.
  const nonFoundation = lessons
    .filter((l) => !FOUNDATION_SLUGS.includes(l.slug))
    .sort((a, b) => a.number - b.number);

  for (const l of nonFoundation) {
    const p = progressByLesson.get(l.id);
    if (!p) continue;
    const step = nextStep(p);
    if (step && step.step !== "start") {
      return {
        lessonId: l.id,
        slug: l.slug,
        number: l.number,
        title: l.title,
        reason: step.reason,
        resumeStep: step.step,
      };
    }
  }

  // Stage 3 — first un-touched lesson.
  for (const l of nonFoundation) {
    if (!progressByLesson.has(l.id)) {
      return {
        lessonId: l.id,
        slug: l.slug,
        number: l.number,
        title: l.title,
        reason: "Next in the sequence.",
        resumeStep: "start",
      };
    }
  }

  // Caught up.
  return null;
}
