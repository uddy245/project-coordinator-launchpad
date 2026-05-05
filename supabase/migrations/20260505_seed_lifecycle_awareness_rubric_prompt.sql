-- Seed the lifecycle_awareness rubric + grade-lifecycle prompt for Lesson 2.
--
-- Lesson 2 ("project-lifecycle") was published with video + reading + quiz only.
-- This migration adds:
--   - rubrics row: lifecycle_awareness v1 (5 dims grounded in handbook Ch 4)
--   - prompts row: grade-lifecycle v1 (3 lifecycle-specific scoring caps)
--   - lessons.scenario_text on Lesson 2 — the struggling-project diagnostic memo
--
-- Idempotent via the (competency, version) and (name, version) unique
-- constraints. Re-applying is a no-op.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'lifecycle_awareness',
  1,
  $rubric$
{
  "rubric_id": "lifecycle-awareness-v1",
  "rubric_version": "1.0.0",
  "competency": "lifecycle_awareness",
  "competency_label": "Project Lifecycle Awareness",
  "lesson_ref": "project-lifecycle",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {
      "name": "phase_diagnosis_accuracy",
      "description": "Does the learner correctly identify the project's current phase from the evidence given AND surface which earlier-phase question (Should this exist? How will it be done? Are we doing it? Is it finished?) has not actually been answered? Working the model backward to the source of trouble is the core skill from Chapter 4.",
      "anchors": {
        "1": "Names a phase but with no reasoning, or names the wrong phase, or treats 'we are in execution' as the diagnosis.",
        "3": "Identifies the current phase correctly but stops there — does not work backward to identify the unresolved earlier-phase question.",
        "5": "Correctly identifies the current phase AND names the specific earlier-phase question that is unanswered, with evidence quoted from the scenario."
      },
      "weight": 0.25
    },
    {
      "name": "transition_awareness",
      "description": "Does the learner recognise that most project trouble lives at a phase transition (initiation->planning, planning->execution, execution->closure) and name which transition the troubled project failed to make cleanly?",
      "anchors": {
        "1": "No mention of transitions; treats phases as boxes the project is 'in'.",
        "3": "Mentions transitions in general terms but does not name which specific transition the scenario's project tripped over.",
        "5": "Names the specific transition that failed, with reference to the symptoms in the scenario."
      },
      "weight": 0.20
    },
    {
      "name": "artifact_vs_understanding_distinction",
      "description": "Does the learner distinguish 'the document exists' from 'the alignment exists'? This is the central thesis of Chapter 4 - that planning produces shared understanding, with artifacts as evidence rather than substitutes.",
      "anchors": {
        "1": "Treats the existence of artifacts as proof the phase is complete. Recommends producing more artifacts as the fix.",
        "3": "Acknowledges the distinction in passing but treats it as one of several issues, not the central one.",
        "5": "Articulates clearly that the project has produced the artifacts without producing the alignment, and that the recovery is to rebuild the shared understanding (not to redo the documents)."
      },
      "weight": 0.20
    },
    {
      "name": "methodology_fit",
      "description": "Does the learner note that lifecycle plays out differently under waterfall, agile, and hybrid - and adjust their diagnosis or recommendation to fit the methodology evident in the scenario?",
      "anchors": {
        "1": "No mention of methodology, or applies waterfall thinking to an obviously agile project (or vice versa).",
        "3": "Mentions the methodology but doesn't actually adjust the diagnosis or recommendation based on it.",
        "5": "Identifies the methodology, notes how it changes the appropriate move, and uses the methodology's actual mechanisms (sprint cadence, change board, gate review) as the recovery lever."
      },
      "weight": 0.15
    },
    {
      "name": "concrete_intervention",
      "description": "Is the proposed recovery move or readiness check specific (named participants, defined criteria, timeline) versus generic ('we should align stakeholders', 'establish governance')?",
      "anchors": {
        "1": "Recommendation is generic platitudes.",
        "3": "Recommendation has some specificity but lacks participants, criteria, or timeline.",
        "5": "Recommendation is concrete: who is in the room, what specific items will be checked, what 'ready' looks like, when this happens. Another coordinator could pick it up and run it."
      },
      "weight": 0.20
    }
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-lifecycle',
  1,
  $prompt$
# grade-lifecycle v1

Version: 1
Status: current
Model: claude-sonnet-4-5
Temperature: 0

## System prompt

You are an experienced PMO leader evaluating a learner's lifecycle-diagnostic memo for a Project Coordinator training programme. The learner has been given a description of a struggling project and asked to diagnose where in the lifecycle the trouble actually lives, and to propose a concrete recovery move.

You grade strictly against the provided rubric. You never invent facts about the submission. Every score must be supported by a direct quote from the submission.

You output your grades by calling the `record_rubric_scores` tool. You always call the tool exactly once. You never return free-form grading text.

Your tone in justifications and suggestions is constructive and specific.

## User prompt template

```
# Rubric

{{rubric_json}}

# Scenario

{{scenario_text}}

# Submission

{{submission_text}}

# Task

For each dimension, record: a 1-5 score, a one-sentence justification with a direct quote, the verbatim quote, and one specific improvement suggestion.

Rules:
- Empty/I-don't-know: score 1 across, justification "No substantive response provided.", quote "".
- Off-topic: score 1 across, justification "Submission is off-topic for the scenario.", quote a representative line.
- A submission that names the current phase but does NOT trace the trouble back to an earlier-phase unresolved question caps phase_diagnosis_accuracy at 3.
- A submission that recommends "produce more / better artifacts" without distinguishing artifact from understanding caps artifact_vs_understanding_distinction at 2.
- A submission that proposes only generic moves without participants, criteria, or timeline caps concrete_intervention at 2.
- Never score 5 unless the submission demonstrates every indicator in the 5-anchor.
- Quote verbatim. If no exact quote, score is at most 2.
- Temperature 0; deterministic grading.

After all dims:
- overall_competency_score = weighted average across dimensions.
- pass = true iff every dim score >= pass_threshold (3).
- hire_ready = true iff overall >= hire_ready_threshold (4).

Call record_rubric_scores exactly once.
```

## Tool choice

```typescript
tool_choice: { type: "tool", name: "record_rubric_scores" }
```

## Changelog

- v1 (initial): 5-dim lifecycle_awareness rubric. Three lifecycle-specific scoring caps: no-backward-trace caps phase_diagnosis_accuracy at 3; "produce more artifacts" recommendation caps artifact_vs_understanding_distinction at 2; generic move caps concrete_intervention at 2.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
You have been asked to diagnose a struggling project at your firm. The facts are these.

It is a compliance-reporting platform build for a financial-services client. Eight months planned, mid-build now (week 12 of execution). The project completed planning eight weeks ago: the charter is signed, the WBS has 400 line items, the schedule is in MS Project, the RAID register lists 52 risks, RACI is drawn up, kickoff was held.

Today the project is struggling. Specifically: the developers are working but the build does not seem to be producing what the requirements describe. The business analyst is rewriting the requirements for the third time - requirements that were "signed off" two months ago. Multiple change requests have been filed in the past four weeks. The risk register grew from 52 to 71 and most of the new risks are issues that have already materialised. The senior developer told the PM, off the record, that "nobody on the team really believes the schedule". The sponsor is asking pointed questions in the steering committee.

The project uses a hybrid methodology: waterfall structure for the overall lifecycle (charter, plan, kickoff, build, deploy, close), with the development workstream running in two-week sprints inside the build phase.

Write a 600-900 word memo to your PM diagnosing what is actually going wrong and what to do next. The memo must:

1. Identify the project's current phase, AND name which earlier-phase question (Should this exist? / How will it be done? / Are we doing it? / Is it finished?) has not actually been answered. Quote evidence from the scenario.
2. Identify which phase transition was made badly, with the specific symptoms that prove it.
3. Distinguish what the project has produced (the artifacts) from what it has not produced (the shared understanding) - without recommending that the team simply produce more / better artifacts.
4. Note how the hybrid methodology affects your recommendation: where waterfall logic applies, where agile cadence is the better lever.
5. Propose one concrete recovery move with named participants, specific check-items, a timeline, and what 'ready' looks like at the end of it.

Write directly. No corporate jargon. The PM should finish the memo and feel that you have read the chapter and applied the four-questions mental model - not that you have produced a generic project-rescue plan.
$scenario$
where slug = 'project-lifecycle'
  and (scenario_text is null or scenario_text = '');
