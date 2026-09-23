import type { RubricJSON } from "@/lib/grading/rubric";

export type Criterion = { label: string; question: string; weightPct: number };

/** "risk_completeness" → "Risk completeness" */
export function humanizeDimension(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Plain-language grading criteria for the Workbook tab, straight from the
 * lesson's current rubric: one line per dimension, heaviest first.
 */
export function rubricCriteria(rubric: RubricJSON): Criterion[] {
  return [...rubric.dimensions]
    .sort((a, b) => b.weight - a.weight)
    .map((d) => ({
      label: humanizeDimension(d.name),
      question: d.description.trim(),
      weightPct: Math.round(d.weight * 100),
    }));
}
