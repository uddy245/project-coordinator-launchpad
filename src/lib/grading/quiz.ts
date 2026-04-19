/**
 * Pure quiz grading. No DB, no I/O. LES-008.
 *
 * Given an item bank and a learner's answers, produce a per-item correct/
 * incorrect breakdown, the total score, and a pass/fail verdict. Default
 * pass threshold is 8 out of 10 — configurable via the third argument.
 *
 * Invariants the caller can rely on:
 *   - Unanswered items count as incorrect (not a crash).
 *   - Answers referencing a non-existent itemId are ignored.
 *   - Answers with a choice that isn't one of the item's options count
 *     as incorrect (not a crash).
 *   - perItem is returned in the same order as `items` — stable for UI.
 */

export type QuizItem = {
  id: string;
  correct: string;
  options?: { id: string }[];
  distractor_rationale?: Record<string, string>;
};

export type QuizAnswer = {
  itemId: string;
  choice: string;
};

export type PerItemResult = {
  itemId: string;
  correct: boolean;
  chosen: string | null;
  expected: string;
  rationale?: string;
};

export type QuizGradeResult = {
  score: number;
  total: number;
  passed: boolean;
  perItem: PerItemResult[];
};

export function gradeQuizAttempt(
  items: QuizItem[],
  answers: QuizAnswer[],
  options: { passThreshold?: number } = {}
): QuizGradeResult {
  const total = items.length;
  const passThreshold = options.passThreshold ?? Math.ceil(total * 0.8);

  // index by id once, so duplicate answers for the same item collapse
  // to the last one (matches typical "change your mind" quiz UX).
  const chosenByItem = new Map<string, string>();
  for (const a of answers) {
    chosenByItem.set(a.itemId, a.choice);
  }

  let score = 0;
  const perItem: PerItemResult[] = items.map((item) => {
    const chosen = chosenByItem.get(item.id) ?? null;
    const validChoice = !item.options || item.options.some((o) => o.id === chosen);
    const correct = validChoice && chosen === item.correct;
    if (correct) score += 1;

    const rationale =
      !correct && chosen && item.distractor_rationale
        ? item.distractor_rationale[chosen]
        : undefined;

    return {
      itemId: item.id,
      correct,
      chosen,
      expected: item.correct,
      rationale,
    };
  });

  return {
    score,
    total,
    passed: score >= passThreshold,
    perItem,
  };
}
