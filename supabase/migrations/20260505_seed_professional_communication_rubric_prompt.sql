-- Seed the professional_communication rubric + grade-voice prompt for Lesson 3.
--
-- Lesson 3 ("written-voice") was published with video + reading + quiz only.
-- This migration adds the gradable artifact pipeline sourced from Chapter 3
-- of the handbook.
--
-- Idempotent via the (competency, version) and (name, version) unique
-- constraints. Re-applying is a no-op.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'professional_communication',
  1,
  $rubric$
{
  "rubric_id": "professional-communication-v1",
  "rubric_version": "1.0.0",
  "competency": "professional_communication",
  "competency_label": "Professional Written Voice",
  "lesson_ref": "written-voice",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"lede_discipline","description":"Does each piece lead with the most important thing the reader needs to know or decide?","anchors":{"1":"All pieces bury the lede behind context or pleasantries.","3":"One or two pieces lead cleanly; others wind up before getting to the point.","5":"Every piece leads with the substance. Subject lines (where present) are concrete and action-oriented."},"weight":0.20},
    {"name":"hedge_density","description":"Are hedges stripped to where they carry real information? When uncertainty is genuine, is it named precisely rather than diffused as a softener?","anchors":{"1":"Cluster of hedges across pieces; opinions buried under softening.","3":"Hedges reduced but still present.","5":"Hedges are absent or carry real information. Uncertainty is named precisely."},"weight":0.20},
    {"name":"apology_hygiene","description":"Are apologies reserved for things that warrant them, rather than reflexive openers?","anchors":{"1":"Reflexive apologies open multiple pieces.","3":"One or two reflexive apologies present.","5":"No reflexive apologies. Where an apology appears, it is doing real work."},"weight":0.15},
    {"name":"register_modulation","description":"Do the three pieces show three distinctly different registers (conversational / standard / formal)?","anchors":{"1":"Same register across all three pieces.","3":"Two registers visible.","5":"Three distinct registers, each fitting its audience and medium."},"weight":0.25},
    {"name":"structural_economy","description":"Does each piece structure information so the reader doesn't have to do interpretive work?","anchors":{"1":"Information dumped without structure.","3":"Structure present in some pieces but inconsistent.","5":"Each piece is structured for its medium and audience. Asks visible. Lengths proportional."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-voice',
  1,
  $prompt$
# grade-voice v1

Version: 1
Status: current
Model: claude-sonnet-4-5
Temperature: 0

## System prompt

You are an experienced PMO leader evaluating a learner's written-voice exercise. The learner has produced three short pieces (Slack to peer, email to PM, note to senior sponsor) covering the same news. You grade the writing itself.

You grade strictly against the provided rubric. Every score must be supported by a direct quote from the submission.

You output your grades by calling the record_rubric_scores tool exactly once.

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
- Empty/off-topic/missing-piece submissions: score affected dimensions at 1.
- Never score 5 unless the submission demonstrates every indicator in the 5-anchor.
- Quote verbatim. If no exact quote, score is at most 2.

Voice-specific scoring caps:
- 3+ hedges in any single piece caps hedge_density at 2.
- Reflexive-apology openers in 2+ pieces caps apology_hygiene at 2.
- Same register across all three pieces caps register_modulation at 2.
- Buried lede in any single piece caps lede_discipline at 3.

Temperature 0; deterministic grading.

After all dims:
- overall_competency_score = weighted average.
- pass = true iff every dim >= pass_threshold (3).
- hire_ready = true iff overall >= hire_ready_threshold (4).

Call record_rubric_scores exactly once.
```

## Changelog

- v1 (initial): 5-dim professional_communication rubric. Four voice-specific scoring caps.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
It is 11:00 on a Tuesday. The vendor on your project has just emailed you to say their team will not deliver the integration plan today, despite a written commitment. They are now asking for an extension to next Wednesday — eight days late.

This affects three things:
1. Raj, the test lead, was planning to start dependent test-prep work tomorrow morning.
2. Helen, your PM, owns the vendor relationship and has a vendor sync booked for Thursday.
3. David Sharma, the sponsor, has not been emailed directly by you before.

Produce three short pieces (combined 350-700 words) handling the situation in writing this morning:

1. Slack to Raj — peer, daily collaborator.
2. Email to Helen (PM) — your manager.
3. Email to David Sharma (Sponsor) — senior, has not been emailed directly by you before.

Apply the chapter's principles. Lede first in every piece. Strip the hedges. Do not apologize for doing your job. Modulate the register — Slack should not read like a sponsor note, and the sponsor note should not read like Slack.

Write all three pieces in a single document. Label each (e.g. "PIECE 1 — SLACK TO RAJ"). Include subject lines for the two emails.
$scenario$
where slug = 'written-voice'
  and (scenario_text is null or scenario_text = '');
