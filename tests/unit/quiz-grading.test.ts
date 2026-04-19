import { describe, it, expect } from "vitest";
import { gradeQuizAttempt, type QuizItem } from "@/lib/grading/quiz";

function items(): QuizItem[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i + 1}`,
    correct: "a",
    options: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    distractor_rationale: {
      b: "b is a common trap",
      c: "c is only partial",
      d: "d misreads the scenario",
    },
  }));
}

describe("gradeQuizAttempt", () => {
  it("returns a perfect score when every answer is correct", () => {
    const answers = items().map((i) => ({ itemId: i.id, choice: "a" }));
    const result = gradeQuizAttempt(items(), answers);
    expect(result.score).toBe(10);
    expect(result.total).toBe(10);
    expect(result.passed).toBe(true);
    expect(result.perItem.every((r) => r.correct)).toBe(true);
  });

  it("returns zero when every answer is wrong", () => {
    const answers = items().map((i) => ({ itemId: i.id, choice: "b" }));
    const result = gradeQuizAttempt(items(), answers);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("counts unanswered items as incorrect (not a crash)", () => {
    const allItems = items();
    const answers = allItems.slice(0, 5).map((i) => ({ itemId: i.id, choice: "a" }));
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.score).toBe(5);
    expect(result.perItem.slice(5).every((r) => r.chosen === null && !r.correct)).toBe(true);
  });

  it("passes at 8/10 by default", () => {
    const allItems = items();
    const answers = allItems.map((i, idx) => ({
      itemId: i.id,
      choice: idx < 8 ? "a" : "b",
    }));
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.score).toBe(8);
    expect(result.passed).toBe(true);
  });

  it("fails at 7/10 by default", () => {
    const allItems = items();
    const answers = allItems.map((i, idx) => ({
      itemId: i.id,
      choice: idx < 7 ? "a" : "b",
    }));
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.score).toBe(7);
    expect(result.passed).toBe(false);
  });

  it("honors a custom passThreshold", () => {
    const allItems = items();
    const answers = allItems.slice(0, 5).map((i) => ({ itemId: i.id, choice: "a" }));
    const result = gradeQuizAttempt(allItems, answers, { passThreshold: 5 });
    expect(result.score).toBe(5);
    expect(result.passed).toBe(true);
  });

  it("ignores answers that reference a non-existent itemId", () => {
    const allItems = items();
    const answers = [
      ...allItems.map((i) => ({ itemId: i.id, choice: "a" })),
      { itemId: "nope", choice: "a" },
    ];
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.score).toBe(10);
    expect(result.perItem).toHaveLength(10);
  });

  it("treats a choice that isn't one of the options as incorrect", () => {
    const allItems = items();
    const answers = [{ itemId: allItems[0]!.id, choice: "zz" }];
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.score).toBe(0);
    expect(result.perItem[0]).toMatchObject({ correct: false, chosen: "zz" });
  });

  it("collapses duplicate answers for the same item (last write wins)", () => {
    const allItems = items();
    const answers = [
      { itemId: allItems[0]!.id, choice: "b" },
      { itemId: allItems[0]!.id, choice: "a" },
    ];
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.perItem[0]?.correct).toBe(true);
    expect(result.score).toBe(1);
  });

  it("surfaces the distractor rationale for wrong answers only", () => {
    const allItems = items();
    const answers = [
      { itemId: allItems[0]!.id, choice: "b" },
      { itemId: allItems[1]!.id, choice: "a" },
    ];
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.perItem[0]?.rationale).toBe("b is a common trap");
    expect(result.perItem[1]?.rationale).toBeUndefined();
  });

  it("returns perItem in the original item order regardless of answer order", () => {
    const allItems = items();
    const answers = [
      { itemId: "item-10", choice: "a" },
      { itemId: "item-1", choice: "b" },
    ];
    const result = gradeQuizAttempt(allItems, answers);
    expect(result.perItem.map((p) => p.itemId)).toEqual(allItems.map((i) => i.id));
  });

  it("works with an empty item list", () => {
    const result = gradeQuizAttempt([], []);
    expect(result).toEqual({ score: 0, total: 0, passed: true, perItem: [] });
  });

  it("works without options metadata on items", () => {
    const bare: QuizItem[] = [{ id: "x", correct: "a" }];
    const result = gradeQuizAttempt(bare, [{ itemId: "x", choice: "a" }]);
    expect(result.score).toBe(1);
  });
});
