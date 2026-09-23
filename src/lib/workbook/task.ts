/**
 * Split a workbook scenario brief into the learner's task and the scenario
 * context. Briefs end with the instruction paragraph ("Use the workbook
 * template to …", "Bring written answers …"); the Workbook tab shows that
 * in the "Your task" box and the rest as the scenario, so it isn't repeated.
 *
 * Briefs without a recognisable task paragraph return task = null and the
 * full brief as the scenario.
 */
const TASK_START =
  /^(use (the|this) workbook|using the workbook|bring |write |draft |build |produce |prepare |create |complete |your task|task:|deliverable)/i;

export function splitTask(brief: string): { task: string | null; scenario: string } {
  const paragraphs = brief
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < 2) return { task: null, scenario: brief.trim() };

  const last = paragraphs[paragraphs.length - 1];
  const isList = /^\s*([-*+]|\d+\.)\s/m.test(last);
  const looksLikeTask =
    !isList &&
    (TASK_START.test(last.replace(/^\*\*|\*\*$/g, "")) || /workbook template/i.test(last));
  if (!looksLikeTask) return { task: null, scenario: brief.trim() };

  return { task: last, scenario: paragraphs.slice(0, -1).join("\n\n") };
}
