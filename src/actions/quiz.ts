"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons, quizAttempts, quizItems as quizItemsTable } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import { canViewLesson } from "@/lib/lessons/access";
import { gradeQuizAttempt, type QuizItem } from "@/lib/grading/quiz";
import { selectQuizItemsForUser, resetSeenHistory, type ServedQuizItem } from "@/lib/quiz/select";
import type { ActionResult } from "@/lib/types";

const AnswerSchema = z.object({
  itemId: z.string().uuid(),
  choice: z.string().min(1),
});

const SubmitSchema = z.object({
  lessonSlug: z.string().min(1),
  answers: z.array(AnswerSchema).min(1),
});

/** Postgres message from a Drizzle error (without the SQL text/params). */
function dbMessage(err: unknown): string {
  const e = err as { cause?: { message?: string }; message?: string } | null;
  return e?.cause?.message ?? e?.message ?? "Database error";
}

type LessonRow = { id: string; title: string; summary: string | null; competency: string };

/**
 * Lesson by slug if this learner may use it (was RLS on lessons): free
 * preview lessons for anyone signed in, else has_access; admins see all.
 */
async function findAccessibleLesson(userId: string, slug: string): Promise<LessonRow | null> {
  const [lesson] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      summary: lessons.summary,
      competency: lessons.competency,
      isPublished: lessons.isPublished,
      isPreview: lessons.isPreview,
    })
    .from(lessons)
    .where(eq(lessons.slug, slug))
    .limit(1);
  if (!lesson) return null;
  return (await canViewLesson(userId, lesson)) ? lesson : null;
}

export type SubmitQuizInput = z.input<typeof SubmitSchema>;

export type SubmitQuizData = {
  score: number;
  total: number;
  passed: boolean;
  perItem: {
    itemId: string;
    correct: boolean;
    chosen: string | null;
    expected: string;
    rationale?: string;
  }[];
};

export async function submitQuizAttempt(
  input: SubmitQuizInput
): Promise<ActionResult<SubmitQuizData>> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      code: "INVALID_INPUT",
    };
  }

  const user = await getAppUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  // Server-side read of quiz_items (the correct answer) and write of
  // quiz_attempts after grading. Auth was enforced above; the user_id we
  // write is bound to the authenticated session, not taken from input.
  let lesson: LessonRow | null;
  try {
    lesson = await findAccessibleLesson(user.id, parsed.data.lessonSlug);
  } catch {
    lesson = null;
  }
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Grade only the items the user was actually served (matched by id from
  // the answers payload), NOT every item in quiz_items for the lesson. With
  // the refresh feature growing the pool, fetching by lesson_id alone would
  // include items the learner never saw and grade them as wrong.
  const answeredIds = parsed.data.answers.map((a) => a.itemId);
  let items: {
    id: string;
    correct: string;
    distractor_rationale: unknown;
    options: unknown;
    lesson_id: string;
  }[];
  try {
    // `correct` / `distractor_rationale` are read server-side for grading
    // only; the response carries just what gradeQuizAttempt returns.
    items = await db
      .select({
        id: quizItemsTable.id,
        correct: quizItemsTable.correct,
        distractor_rationale: quizItemsTable.distractorRationale,
        options: quizItemsTable.options,
        lesson_id: quizItemsTable.lessonId,
      })
      .from(quizItemsTable)
      .where(inArray(quizItemsTable.id, answeredIds));
  } catch {
    items = [];
  }
  if (items.length === 0) {
    return {
      ok: false,
      error: "Quiz items not available.",
      code: "NO_ITEMS",
    };
  }
  // Reject any answers referencing items that don't belong to this lesson —
  // prevents a malicious client from grading against arbitrary items.
  const lessonId = lesson.id;
  if (items.some((it) => it.lesson_id !== lessonId)) {
    return {
      ok: false,
      error: "Answer set references items outside this lesson.",
      code: "INVALID_INPUT",
    };
  }

  const quizItems: QuizItem[] = items.map((row) => ({
    id: row.id,
    correct: row.correct,
    options: row.options as { id: string }[],
    distractor_rationale: row.distractor_rationale as Record<string, string>,
  }));

  const result = gradeQuizAttempt(quizItems, parsed.data.answers);

  try {
    await db.insert(quizAttempts).values({
      userId: user.id,
      lessonId,
      score: result.score,
      total: result.total,
      passed: result.passed,
      rawAnswers: parsed.data.answers,
    });
  } catch (err) {
    return {
      ok: false,
      error: `Failed to record attempt: ${dbMessage(err)}`,
      code: "DB_ERROR",
    };
  }

  // Flip quiz_passed on the progress row when the learner passes.
  // Idempotent on the composite PK; a later lower-scoring attempt
  // does not clear the flag (pass once = passed).
  if (result.passed) {
    try {
      await db
        .insert(lessonProgress)
        .values({ userId: user.id, lessonId, quizPassed: true })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: { quizPassed: true },
        });
    } catch (err) {
      // Old code didn't check this write; the attempt is already recorded.
      console.error("[submitQuizAttempt] lesson_progress upsert failed", err);
    }

    // Invalidate the Next.js router cache for pages that read from
    // lesson_progress so the learner sees "In progress" immediately
    // instead of having to hard-refresh.
    revalidatePath("/dashboard");
    revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  }

  return { ok: true, data: result };
}

// ──────────────────────────────────────────────────────────────────────
// Refresh quiz: pick a new set of unseen items, generating via Claude
// when the pool is exhausted. Stateless from the UI's perspective —
// returns the new items, the page just re-renders the player with them.
// ──────────────────────────────────────────────────────────────────────

const RefreshSchema = z.object({ lessonSlug: z.string().min(1) });

export type RefreshQuizData = {
  items: ServedQuizItem[];
  generated: number;
  poolExhausted: boolean;
};

export async function refreshQuizItems(
  input: z.input<typeof RefreshSchema>
): Promise<ActionResult<RefreshQuizData>> {
  const parsed = RefreshSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  let lesson: LessonRow | null;
  try {
    lesson = await findAccessibleLesson(user.id, parsed.data.lessonSlug);
  } catch {
    lesson = null;
  }
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // The selector scopes quiz_item_seen reads/writes by the user_id we pass
  // in (from the session) and never returns `correct`.
  try {
    const result = await selectQuizItemsForUser({
      userId: user.id,
      lessonId: lesson.id,
      lessonSlug: parsed.data.lessonSlug,
      lessonTitle: lesson.title,
      lessonSummary: lesson.summary,
      competency: lesson.competency,
      count: 10,
    });
    revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Refresh failed",
      code: "REFRESH_FAILED",
    };
  }
}

export async function resetQuizHistory(
  input: z.input<typeof RefreshSchema>
): Promise<ActionResult<{ deleted: number }>> {
  const parsed = RefreshSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", code: "INVALID_INPUT" };
  }

  const user = await getAppUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  let result: { deleted: number };
  try {
    const [lesson] = await db
      .select({ id: lessons.id, isPublished: lessons.isPublished, isPreview: lessons.isPreview })
      .from(lessons)
      .where(eq(lessons.slug, parsed.data.lessonSlug))
      .limit(1);
    if (!lesson) {
      return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
    }

    // Deletes only this user's quiz_item_seen rows (owner-scoped in the helper).
    result = await resetSeenHistory({
      userId: user.id,
      lessonId: lesson.id,
    });
  } catch (err) {
    return { ok: false, error: dbMessage(err), code: "DB_ERROR" };
  }
  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: result };
}
