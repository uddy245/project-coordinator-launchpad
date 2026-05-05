-- Seed the methodology_fluency rubric + grade-methodology prompt for Lesson 5.
--
-- Sourced from Chapter 5 (Waterfall, Agile, and the Space Between).
-- Idempotent via unique constraints.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'methodology_fluency',
  1,
  $rubric$
{
  "rubric_id": "methodology-fluency-v1",
  "rubric_version": "1.0.0",
  "competency": "methodology_fluency",
  "competency_label": "Methodology Fluency for Project Coordinators",
  "lesson_ref": "methodologies",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"fit_framework_application","description":"Does the learner apply the chapter's four-question framework to recommend the methodology mix?","anchors":{"1":"Picks a methodology by preference or label.","3":"Applies one or two of the four questions.","5":"Applies all four questions with concrete answers grounded in the scenario."},"weight":0.25},
    {"name":"hybrid_recognition","description":"Does the learner recognise that the right answer is usually a hybrid?","anchors":{"1":"Recommends pure waterfall or pure agile.","3":"Acknowledges hybrid in passing but functionally pure-one-way.","5":"Explicit hybrid with workstream-by-workstream weighting."},"weight":0.20},
    {"name":"translation_specificity","description":"Does the learner name concrete translation moves between waterfall governance and agile workstreams?","anchors":{"1":"Generic platitudes about 'aligning' or 'translating'.","3":"One or two specific moves named.","5":"Three or more concrete moves with cadence and ownership."},"weight":0.20},
    {"name":"failure_mode_awareness","description":"Does the learner spot one of the chapter's named failure modes in the scenario?","anchors":{"1":"No mention of failure modes.","3":"Names one failure mode in passing.","5":"Names the specific failure mode the scenario is risking with quoted evidence and prevention move."},"weight":0.15},
    {"name":"non_partisan_posture","description":"Does the learner stay out of the methodology fight?","anchors":{"1":"Picks a side; lectures one camp.","3":"Mostly neutral but with slips into advocacy.","5":"Consistently translator-posture; recommendations framed as fit-to-work."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-methodology',
  1,
  $prompt$
# grade-methodology v1

You are an experienced PMO leader evaluating a learner's methodology-fit memo. Grade strictly against the rubric. Every score must be supported by a direct quote.

Methodology-specific scoring caps:
- Pure waterfall or pure agile across a clearly mixed-characteristic project caps both fit_framework_application AND hybrid_recognition at 2.
- "Waterfall is dead", "Agile is undisciplined", or any framing that lectures one camp using the other camp's polemics caps non_partisan_posture at 2.
- Generic translation recommendations with no concrete mechanism cap translation_specificity at 2.
- Skipping the four-question framework entirely caps fit_framework_application at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
You are the Project Coordinator on a new programme starting next month at a mid-sized retail bank. The programme is a customer-onboarding platform replacement. Eighteen-month plan. Mixed characteristics:

- The development workstream faces emergent requirements: regulators have opened a consultation on identity-verification standards that may shift mid-build. The dev lead, J. Patel, wants two-week sprints, a product owner, and no PMO-format status reports.

- The procurement workstream has a fixed timeline driven by a regulatory deadline. The procurement lead, K. Bell, wants the standard waterfall artefacts: charter, milestone schedule, change control board, monthly steering reports.

- The change-management workstream (training 4,000 staff, retiring the old system, comms to 2.3M customers) has dependencies on dev and procurement.

- Governance: the bank's Risk Committee requires a documented project plan, formal change control on regulated requirements, monthly steering reports in a specified template, quarterly portfolio reviews.

J. Patel and K. Bell have already had two heated meetings about methodology. Both have escalated to your PM.

Write a 700-1100 word memo for the steering committee proposing the working model. Apply the four-question framework workstream-by-workstream. Recommend an explicit hybrid. Propose three to five concrete translation moves with cadence and ownership. Name the specific failure mode the J. Patel / K. Bell argument is risking with a prevention move. Stay out of the methodology fight - frame everything as fit-to-work.
$scenario$
where slug = 'methodologies'
  and (scenario_text is null or scenario_text = '');
