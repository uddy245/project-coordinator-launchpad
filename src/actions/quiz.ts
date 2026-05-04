"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Require authentication via the user-scoped client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };
  }

  // Service role for reading quiz_items (the correct answer) and writing
  // quiz_attempts after grading. Auth was enforced above; the user_id we
  // write is bound to the authenticated session, not taken from input.
  const admin = createAdminClient();

  const { data: lesson, error: lessonErr } = await admin
    .from("lessons")
    .select("id")
    .eq("slug", parsed.data.lessonSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (lessonErr || !lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Grade only the items the user was actually served (matched by id from
  // the answers payload), NOT every item in quiz_items for the lesson. With
  // the refresh feature growing the pool, fetching by lesson_id alone would
  // include items the learner never saw and grade them as wrong.
  const answeredIds = parsed.data.answers.map((a) => a.itemId);
  const { data: items, error: itemsErr } = await admin
    .from("quiz_items")
    .select("id, correct, distractor_rationale, options, lesson_id")
    .in("id", answeredIds);
  if (itemsErr || !items || items.length === 0) {
    return {
      ok: false,
      error: "Quiz items not available.",
      code: "NO_ITEMS",
    };
  }
  // Reject any answers referencing items that don't belong to this lesson —
  // prevents a malicious client from grading against arbitrary items.
  if (items.some((it) => it.lesson_id !== lesson.id)) {
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

  const { error: insertErr } = await admin.from("quiz_attempts").insert({
    user_id: user.id,
    lesson_id: lesson.id,
    score: result.score,
    total: result.total,
    passed: result.passed,
    raw_answers: parsed.data.answers,
  });
  if (insertErr) {
    return {
      ok: false,
      error: `Failed to record attempt: ${insertErr.message}`,
      code: "DB_ERROR",
    };
  }

  // Flip quiz_passed on the progress row when the learner passes.
  // Idempotent on the composite PK; a later lower-scoring attempt
  // does not clear the flag (pass once = passed).
  if (result.passed) {
    await admin.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        quiz_passed: true,
      },
      { onConflict: "user_id,lesson_id" }
    );

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, summary, competency")
    .eq("slug", parsed.data.lessonSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  // Use the admin client so generate.ts can read existing stems and the
  // selector can write to quiz_item_seen on behalf of the user. The
  // selector still scopes everything by user_id we pass in.
  try {
    const result = await selectQuizItemsForUser({
      supabase: admin,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" };

  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id")
    .eq("slug", parsed.data.lessonSlug)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found.", code: "NOT_FOUND" };
  }

  const result = await resetSeenHistory({
    supabase: admin,
    userId: user.id,
    lessonId: lesson.id,
  });
  revalidatePath(`/lessons/${parsed.data.lessonSlug}`);
  return { ok: true, data: result };
}
