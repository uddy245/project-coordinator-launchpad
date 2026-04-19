-- ==========================================================================
-- Migration: 20260105_seed_lesson_20.sql
-- Ticket: LES-001
-- Purpose: Seed Lesson 20 (RAID Logs) + RAID rubric v1 + grading prompt v1.
-- Idempotent — safe to run on an environment that already has any of these.
-- The canonical content of these rows also lives in:
--   docs/rubrics/raid-v1.json
--   docs/prompts/grade-raid-v1.md
-- Keep the three in sync; the repo copies are the source of truth.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Lesson 20 — RAID Logs
-- --------------------------------------------------------------------------
insert into public.lessons (slug, number, title, summary, scenario_text, estimated_minutes, is_published)
values (
  'raid-logs',
  20,
  'RAID Logs',
  'Risks, Assumptions, Issues, and Dependencies: the PMO discipline for surfacing what matters before it becomes a fire.',
  $scenario$
You are the Project Coordinator on a six-month systems integration for a mid-size healthcare provider. The project went live two weeks ago in a pilot clinic. Scope creep has added three new integration endpoints since kickoff, the lead engineer is on paternity leave for the next four weeks, the vendor just announced a version bump that deprecates one of your APIs in 90 days, and the product owner has hinted they want to expand to two more clinics before the originally-agreed stabilization period ends. Your steering committee meets in four days.

Build a RAID log (Risks, Assumptions, Issues, Dependencies) to bring to that steering committee. Use the provided workbook template or an equivalent structure of your choice. Aim for 8–15 items total across the four categories, with enough detail that your VP of Operations could walk in cold and understand what to worry about, what to ask about, and who owns the next step on each item.
  $scenario$,
  60,
  true
)
on conflict (slug) do update
  set title = excluded.title,
      summary = excluded.summary,
      scenario_text = excluded.scenario_text,
      estimated_minutes = excluded.estimated_minutes,
      is_published = excluded.is_published,
      updated_at = now();

-- --------------------------------------------------------------------------
-- RAID rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'risk_identification',
  1,
  $rubric${
    "rubric_id": "raid-v1",
    "rubric_version": "1.0.0",
    "competency": "risk_identification",
    "competency_label": "RAID Log Discipline",
    "lesson_ref": "raid-logs",
    "pass_threshold": 3,
    "hire_ready_threshold": 4,
    "dimensions": [
      {
        "name": "risk_completeness",
        "description": "Does each risk have trigger, impact, likelihood, owner, and mitigation?",
        "anchors": {
          "1": "Risks listed as vague bullets, no structure, no owner.",
          "3": "Most risks have owner + impact + likelihood; triggers and mitigations inconsistent.",
          "5": "Every risk has all five fields filled clearly; mitigations are specific and actionable."
        },
        "weight": 0.30
      },
      {
        "name": "risk_differentiation",
        "description": "Does the learner correctly distinguish Risk from Issue from Assumption from Dependency?",
        "anchors": {
          "1": "RAID items mislabeled; issues tagged as risks, dependencies as assumptions.",
          "3": "Most categories correct; occasional slippage between Risk/Issue or Assumption/Dependency.",
          "5": "Crisp differentiation; no miscategorization across the log."
        },
        "weight": 0.20
      },
      {
        "name": "mitigation_realism",
        "description": "Are mitigations specific, actionable, and proportional to impact?",
        "anchors": {
          "1": "Generic mitigations ('monitor closely', 'keep eye on').",
          "3": "Some specific mitigations, some vague.",
          "5": "All mitigations are specific, assigned to a role, proportional to the risk's impact and likelihood."
        },
        "weight": 0.20
      },
      {
        "name": "ownership_and_accountability",
        "description": "Is every RAID item owned by a named role with a follow-up date?",
        "anchors": {
          "1": "No owners named.",
          "3": "Most items have owners; some orphans; follow-up dates inconsistent.",
          "5": "Every item has named owner (or role) and explicit follow-up date."
        },
        "weight": 0.15
      },
      {
        "name": "living_artifact_evidence",
        "description": "Does the submission show the RAID log evolved week-over-week (updated status, closed items, new entries)?",
        "anchors": {
          "1": "Single snapshot, no evidence of updates.",
          "3": "Some evidence of weekly updates or status changes.",
          "5": "Clear week-over-week evolution with status changes, closed items, and new entries."
        },
        "weight": 0.15
      }
    ]
  }$rubric$::jsonb,
  true
)
on conflict (competency, version) do update
  set schema_json = excluded.schema_json,
      is_current = excluded.is_current;

-- --------------------------------------------------------------------------
-- Grading prompt v1 (body mirrors docs/prompts/grade-raid-v1.md)
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-raid',
  1,
  $prompt$# grade-raid v1

Version: 1
Status: current
Model: claude-sonnet-4-5
Temperature: 0

## System prompt

You are an expert PMO reviewer evaluating a learner's RAID log submission for a Project Coordinator training program. You grade strictly against the provided rubric. You never invent facts about the submission. Every score must be supported by a direct quote from the submission.

You output your grades by calling the `record_rubric_scores` tool. You always call the tool exactly once. You never return free-form grading text.

Your tone in justifications and suggestions is constructive and specific. You explain what is missing or weak, not just label it. Your suggestions are actionable — something the learner can apply next week.

## User prompt template

Variables are interpolated at render time from the grading service.

# Rubric

{{rubric_json}}

# Scenario the learner was asked to RAID

{{scenario_text}}

# Learner's submission (plain text extracted from their RAID log file)

{{submission_text}}

# Task

For each dimension in the rubric above, record:

1. A score from 1 to 5 matching the rubric anchor closest to the evidence in the submission.
2. A one-sentence justification that explicitly references a direct quote from the submission.
3. The verbatim quote from the submission that supports your score (copy-paste, do not paraphrase).
4. One specific improvement suggestion the learner could apply next week.

Rules:
- If the submission is empty or says "I don't know" or equivalent, return score 1 for every dimension with justification "No substantive response provided." and quote "".
- If a dimension cannot be evaluated from the submission, score 1 with justification "Dimension not addressed in submission." and quote "".
- Never score 5 unless the submission demonstrates every indicator in the 5-anchor.
- Quote verbatim — do not paraphrase. If you cannot find an exact quote, the score is at most 2.
- Temperature 0; this is a deterministic grading task.

After grading all dimensions:
- Compute overall_competency_score as the weighted average across dimensions (use the weights in the rubric).
- Set pass = true iff every dimension score is at least the rubric's pass_threshold (default 3).
- Set hire_ready = true iff overall_competency_score is at least the rubric's hire_ready_threshold (default 4).

Call `record_rubric_scores` exactly once with your complete output.
$prompt$,
  true
)
on conflict (name, version) do update
  set body = excluded.body,
      is_current = excluded.is_current;
