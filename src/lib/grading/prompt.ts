/**
 * Prompt template interpolation. The stored prompt uses {{rubric_json}},
 * {{scenario_text}}, {{submission_text}} placeholders. Missing variables
 * are left as-is (safe but visible in the prompt) so regressions show
 * up during calibration, not silently.
 */
export function renderPrompt(
  template: string,
  vars: {
    rubric_json: string;
    scenario_text: string;
    submission_text: string;
  }
): string {
  return template
    .replaceAll("{{rubric_json}}", vars.rubric_json)
    .replaceAll("{{scenario_text}}", vars.scenario_text)
    .replaceAll("{{submission_text}}", vars.submission_text);
}
