/**
 * Workbook template descriptors, keyed by lesson slug. Each new lesson
 * that publishes a workbook adds an entry here. A lesson with no entry
 * falls back to an empty-state message in the workbook tab.
 *
 * The actual XLSX files live under public/templates/ — this module is
 * just the catalog.
 */

export type Template = {
  file: string;
  title: string;
  kind: "starter" | "example";
  description: string;
};

export const TEMPLATES_BY_SLUG: Record<string, Template[]> = {
  "raid-logs": [
    {
      file: "/templates/raid_log_starter.xlsx",
      title: "Starter RAID log",
      kind: "starter",
      description:
        "Empty template with the standard columns (ID, Type, Description, Trigger, Impact, Likelihood, Mitigation, Owner, Follow-up date, Status). Start here.",
    },
    {
      file: "/templates/raid_log_novice_example.xlsx",
      title: "Novice example",
      kind: "example",
      description:
        "Common early-career mistakes: vague mitigations, missing owners, no follow-up dates. Study the gaps.",
    },
    {
      file: "/templates/raid_log_intermediate_example.xlsx",
      title: "Intermediate example",
      kind: "example",
      description:
        "Most fields filled, owners named. Mitigations trend toward specific but some are still soft.",
    },
    {
      file: "/templates/raid_log_hire_ready_example.xlsx",
      title: "Hire-ready example",
      kind: "example",
      description:
        "What a steering-committee-grade RAID looks like. Specific, owned, dated, proportional mitigations.",
    },
  ],
};

export function templatesFor(lessonSlug: string): Template[] {
  return TEMPLATES_BY_SLUG[lessonSlug] ?? [];
}
