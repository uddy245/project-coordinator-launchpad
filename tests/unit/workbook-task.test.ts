import { describe, it, expect } from "vitest";
import { splitTask, stripTaskLabel } from "@/lib/workbook/task";

describe("splitTask", () => {
  it("pulls the closing 'Use the workbook template' paragraph out as the task", () => {
    const brief =
      "You're a coordinator at **Atlas Care**.\n\nThe CTO wants options.\n\nUse the workbook template to surface the five variables.";
    expect(splitTask(brief)).toEqual({
      task: "Use the workbook template to surface the five variables.",
      scenario: "You're a coordinator at **Atlas Care**.\n\nThe CTO wants options.",
    });
  });

  it("recognises other imperative task openers", () => {
    expect(splitTask("Context.\n\nBring written answers and one commitment.").task).toBe(
      "Bring written answers and one commitment."
    );
  });

  it("leaves briefs without a task paragraph intact", () => {
    const brief = "Context here.\n\nYou have:\n- The SOW.\n- The email thread.";
    expect(splitTask(brief)).toEqual({ task: null, scenario: brief });
  });

  it("handles single-paragraph briefs", () => {
    expect(splitTask("Just one paragraph.")).toEqual({
      task: null,
      scenario: "Just one paragraph.",
    });
  });

  it("strips a leading 'Your task:' label (plain, bold, or dashed) and capitalises", () => {
    for (const last of [
      "Your task: use the workbook template to draft all three messages.",
      "**Your task:** use the workbook template to draft all three messages.",
      "**Your task**: use the workbook template to draft all three messages.",
      "Your task — use the workbook template to draft all three messages.",
    ]) {
      expect(splitTask(`Context.\n\n${last}`).task).toBe(
        "Use the workbook template to draft all three messages."
      );
    }
  });

  it("leaves task sentences without the label unchanged", () => {
    expect(stripTaskLabel("Use the workbook template to plan.")).toBe(
      "Use the workbook template to plan."
    );
    expect(stripTaskLabel("Your tasks this week are listed below.")).toBe(
      "Your tasks this week are listed below."
    );
  });
});
