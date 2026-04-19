"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeQuizAttempt, type QuizItem } from "@/lib/grading/quiz";
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

  const { data: items, error: itemsErr } = await admin
    .from("quiz_items")
    .select("id, correct, distractor_rationale, options")
    .eq("lesson_id", lesson.id)
    .order("sort", { ascending: true });
  if (itemsErr || !items || items.length === 0) {
    return {
      ok: false,
      error: "Quiz items not available.",
      code: "NO_ITEMS",
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
