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
  "coordinator-role": [
    {
      file: "/templates/coordinator_role_self_audit.xlsx",
      title: "Coordinator self-audit (starter)",
      kind: "starter",
      description:
        "Three-part workbook: rate yourself on the five buckets, name the role you're actually in, and commit to the five tomorrow actions. Bring it to your next 1:1.",
    },
    {
      file: "/templates/coordinator_role_sample_banking.xlsx",
      title: "Banking · Capital Markets — sample",
      kind: "example",
      description:
        "A 9-month-in junior coordinator on a regulatory reporting platform. Five Buckets scored, inbox audit from a real Tuesday, role placement.",
    },
    {
      file: "/templates/coordinator_role_sample_healthcare.xlsx",
      title: "Healthcare · EMR — sample",
      kind: "example",
      description:
        "An aspiring-PM coordinator running the clinical-readiness workstream of a regional hospital EMR migration.",
    },
    {
      file: "/templates/coordinator_role_sample_saas.xlsx",
      title: "SaaS · Tech — sample",
      kind: "example",
      description:
        "A hybrid coordinator-analyst at a B2B SaaS company supporting a billing platform rollout.",
    },
  ],

  "project-lifecycle": [
    {
      file: "/templates/project_lifecycle_phase_map.xlsx",
      title: "Lifecycle support map (starter)",
      kind: "starter",
      description:
        "One page per project. Map the five phases against your current support work, the next gate, the artifact you maintain, and the risk to watch — plus the six phase-boundary questions.",
    },
    {
      file: "/templates/lifecycle_sample_construction.xlsx",
      title: "Construction · Infrastructure — sample",
      kind: "example",
      description:
        "Light rail station expansion ($280M). Heavy waterfall frame, controlled drawings, gating model with substantial-completion milestone.",
    },
    {
      file: "/templates/lifecycle_sample_saas_billing.xlsx",
      title: "SaaS · Product — sample",
      kind: "example",
      description:
        "B2B billing platform replacement (9 months). Hybrid: waterfall outer frame, agile inside. Pilot cohort gating.",
    },
    {
      file: "/templates/lifecycle_sample_public_sector.xlsx",
      title: "Public Sector · Regulatory — sample",
      kind: "example",
      description:
        "Provincial tax-filing system rebuild ($40M / 24 months). Strict gating, multi-stakeholder oversight, OAG audit.",
    },
  ],

  "written-voice": [
    {
      file: "/templates/written_voice_editing_pass.xlsx",
      title: "Editing pass workbook (starter)",
      kind: "starter",
      description:
        "Take three real emails and apply the editing pass. Audit your last five sent emails for hedges and apologies. Practise the same message in three registers.",
    },
    {
      file: "/templates/written_voice_sample_financial.xlsx",
      title: "Financial Services · Formal — sample",
      kind: "example",
      description:
        "Asset-management compliance programme. Formal register. Worked before/after edits, subject-line rewrites, four-sentence bad-news restructure.",
    },
    {
      file: "/templates/written_voice_sample_tech.xlsx",
      title: "Tech · Conversational — sample",
      kind: "example",
      description:
        "Internal engineering communications at a SaaS company. Conversational register. Slack and short-email patterns.",
    },
    {
      file: "/templates/written_voice_sample_healthcare.xlsx",
      title: "Healthcare · Compliance-aware — sample",
      kind: "example",
      description:
        "Hospital EMR rollout. Standard register, PHI awareness, clinical leadership audience.",
    },
  ],

  "mindset": [
    {
      file: "/templates/mindset_practice_tracker.xlsx",
      title: "Mindset practice tracker (starter)",
      kind: "starter",
      description:
        "Four-sheet workbook: score yourself on the seven shifts and pick one for 30 days, run the 6-week ownership daily question, log your composure 10-minute-rule moments, and track mistakes through own → fix → learn → move on.",
    },
    {
      file: "/templates/mindset_sample_banking.xlsx",
      title: "Banking · Capital Markets — sample",
      kind: "example",
      description:
        "A coordinator 18 months into a 2-year migration; PM away on holiday for 10 days. Seven Shifts scored, daily ownership question through a real week, composure log.",
    },
    {
      file: "/templates/mindset_sample_public_sector.xlsx",
      title: "Public Sector · Programme — sample",
      kind: "example",
      description:
        "A 24-month provincial tax-system build. Multi-stakeholder governance and constant political weather. Long-view scoring strong; daily question and composure log filled in.",
    },
    {
      file: "/templates/mindset_sample_startup.xlsx",
      title: "Startup · Founder-led — sample",
      kind: "example",
      description:
        "A coordinator at a Series B SaaS startup. Founder is the sponsor; cadence is fast; boundaries blur. Seven Shifts and composure scored to that context.",
    },
  ],

  "methodologies": [
    {
      file: "/templates/methodology_fit_diagnostic.xlsx",
      title: "Methodology Fit Diagnostic (starter)",
      kind: "starter",
      description:
        "Three-sheet workbook: score your project against the four diagnostic questions, spot-check the five common failure modes, and map translation work between agile workstreams and waterfall governance.",
    },
    {
      file: "/templates/methodology_sample_pharma.xlsx",
      title: "Pharma · Regulated — sample",
      kind: "example",
      description:
        "A Phase III clinical-trial software build. GxP / 21 CFR Part 11 environment. Hybrid weighted heavily toward waterfall, with sprint UI work inside validated gates.",
    },
    {
      file: "/templates/methodology_sample_saas_pure_agile.xlsx",
      title: "SaaS · Pure Agile — sample",
      kind: "example",
      description:
        "A Series A B2B SaaS product team running pure agile. 22 engineers, lightweight governance, but with Scrum-but findings around retros that don't drive change.",
    },
    {
      file: "/templates/methodology_sample_banking_hybrid.xlsx",
      title: "Banking · Hybrid — sample",
      kind: "example",
      description:
        "A $140M / 36-month banking core modernisation. Multiple agile vendor teams inside a waterfall frame; coordinator role is heavy translation toward OSFI evidence.",
    },
  ],

  "governance": [
    {
      file: "/templates/governance_reading_kit.xlsx",
      title: "Governance reading kit (starter)",
      kind: "starter",
      description:
        "Four-sheet workbook for reading the real decision architecture: stated-vs-actual gap, stakeholder map (influence × engagement), sponsor-type diagnostic, and a RACI audit you can take to your PM in your next 1:1.",
    },
    {
      file: "/templates/governance_sample_public_sector.xlsx",
      title: "Public Sector · Provincial — sample",
      kind: "example",
      description:
        "A provincial tax-system build with deputy minister sponsor. Most decisions made in 30-min pre-briefings; the SC ratifies. Stated/actual gap is large in eight of nine items.",
    },
    {
      file: "/templates/governance_sample_banking.xlsx",
      title: "Banking · OSFI-overseen — sample",
      kind: "example",
      description:
        "Capital-markets risk-platform replacement ($80M). Strong PMO with teeth. CRO is the actual decider; multi-name Accountable rows flagged.",
    },
    {
      file: "/templates/governance_sample_startup.xlsx",
      title: "Startup · Founder-led — sample",
      kind: "example",
      description:
        "Series B SaaS, billing-platform replacement. Founder is sponsor; coordinator is de facto PMO; over-engagement managed via structured weekly briefing.",
    },
  ],

  "variables": [
    {
      file: "/templates/five_variable_posture.xlsx",
      title: "Five-Variable Posture (starter)",
      kind: "starter",
      description:
        "Four-sheet workbook: assess flex remaining in each of the five variables, audit the three kinds of scope, map each risk to the variable it threatens, and track contingency consumption.",
    },
    {
      file: "/templates/variables_sample_retail_loyalty.xlsx",
      title: "Retail · Customer-facing — sample",
      kind: "example",
      description:
        "The chapter's case study. Sponsor declared all three corners fixed; pressure absorbed silently into quality. Worked posture, scope-triple gap, risk mapping, contingency burn-out.",
    },
    {
      file: "/templates/variables_sample_pharma_trial.xlsx",
      title: "Pharma · Clinical Trial — sample",
      kind: "example",
      description:
        "A Phase III clinical-trial platform. Quality bar is regulatory and non-negotiable; healthy contingency consumption (12.5% schedule, 17% cost at month 8).",
    },
    {
      file: "/templates/variables_sample_saas_migration.xlsx",
      title: "SaaS · Migration — sample",
      kind: "example",
      description:
        "Internal billing-platform migration (9 months). Hybrid project, customer-churn risk live, healthy contingency posture at month 7.",
    },
  ],

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
