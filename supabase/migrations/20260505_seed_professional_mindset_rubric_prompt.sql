-- Seed the professional_mindset rubric + grade-mindset prompt for Lesson 4.
--
-- Lesson 4 ("mindset") was published with video + reading + quiz only.
-- Sourced from Chapter 2 of the handbook (six mindset shifts).
--
-- Idempotent via the (competency, version) and (name, version) unique
-- constraints.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'professional_mindset',
  1,
  $rubric$
{
  "rubric_id": "professional-mindset-v1",
  "rubric_version": "1.0.0",
  "competency": "professional_mindset",
  "competency_label": "Professional Mindset for Project Coordinators",
  "lesson_ref": "mindset",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"ownership_orientation","description":"Does the learner demonstrate the ownership mindset rather than the task mindset?","anchors":{"1":"Pure task-mindset: every issue is flagged for the PM's return.","3":"Mixed: takes ownership of one or two issues but punts the others.","5":"Clear ownership across all triggers; distinguishes routine from non-routine."},"weight":0.25},
    {"name":"composure_under_pressure","description":"Does the learner respond to substance, not tone?","anchors":{"1":"Defensive or matching the heat.","3":"Composed but bland.","5":"Crisp, calm response to substance. Reads as the eye of the storm."},"weight":0.20},
    {"name":"honest_admission","description":"When the learner does not know something or has made a mistake, do they say so cleanly?","anchors":{"1":"Fabricates, deflects, or buries in hedge-language.","3":"Admits gaps with excessive softening or partial deflection.","5":"Says 'I do not know' or 'I made an error' cleanly with action attached."},"weight":0.20},
    {"name":"failure_response_quality","description":"When the learner has made a mistake, do they follow own/fix/extract?","anchors":{"1":"Hides, excuses, catastrophizes, or spirals.","3":"Owns and fixes but skips lesson-extraction.","5":"Clean own/fix/extract."},"weight":0.15},
    {"name":"long_view_indicators","description":"Does the response show the long-view mindset?","anchors":{"1":"Carries grievance, picks fights, or shortcuts work.","3":"Mostly long-view but slips somewhere.","5":"Consistent long-view posture."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-mindset',
  1,
  $prompt$
# grade-mindset v1

You are an experienced PMO leader evaluating a learner's mindset memo. The learner has been given a difficult Monday-morning scenario (vendor slip during PM leave, sharp email from senior stakeholder, mistake on Friday's status report) and asked to write a memo to the PM on her return explaining what they did and which mindset shifts applied.

Grade strictly against the rubric. Every score must be supported by a direct quote.

Mindset-specific scoring caps:
- 'Wait for the PM to return' framing on issues within reach caps ownership_orientation at 2.
- Reflexive apology repeated 3+ times for a single mistake caps failure_response_quality at 2.
- Defensive language (had no way to know, was not really my responsibility) caps both honest_admission AND failure_response_quality at 2.
- Carrying a grievance into the response caps long_view_indicators at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
It is Monday morning. Your PM, Helen, started a ten-day annual leave on Friday. Her standing instruction: "If anything comes up that worries you, call me. Otherwise run it."

Three things have happened since Friday close.

1. The vendor missed a deliverable due Friday. T. Reyes emailed Friday 5:47 pm: "Won't make today, will revert with revised date." No new date. No root cause.

2. A senior stakeholder M. Whitfield emailed you Friday afternoon - not the PM - with a sharp two-line message about a regulatory edge case in the new system: "Need to know how this handles split-jurisdiction reporting. Surprised this hasn't been raised. Need answer this week." You don't know the answer.

3. You discovered late Friday that the finance figure on your status report was outdated by two weeks. The PM had signed off the report. The number is wrong but not catastrophic (47k variance against 2.3m budget). The status went to the sponsor and four other senior stakeholders.

Write a 700-1000 word memo to be sent to Helen on her return, explaining what you actually did and which mindset shifts you applied. Be honest. If you handled something poorly, say so and say what you would do differently.

Cover all three triggers. Show the ownership mindset where it applies. Demonstrate composure on the M. Whitfield email. Address the finance-figure mistake using own/fix/extract. Show the long view.
$scenario$
where slug = 'mindset'
  and (scenario_text is null or scenario_text = '');
