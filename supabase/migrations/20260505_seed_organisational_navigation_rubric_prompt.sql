-- Seed organisational_navigation rubric + grade-governance prompt for Lesson 6.
-- Sourced from Chapter 6 (Governance, Roles, and the People You Answer To).
-- Idempotent.

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'organisational_navigation',
  1,
  $rubric$
{
  "rubric_id": "organisational-navigation-v1",
  "rubric_version": "1.0.0",
  "competency": "organisational_navigation",
  "competency_label": "Organisational Navigation and Governance Reading",
  "lesson_ref": "governance",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"stated_vs_actual_gap_recognition","description":"Does the learner identify the gap between stated and actual governance?","anchors":{"1":"Treats stated structure at face value.","3":"Notices some decisions happen outside the formal structure but does not name the gap explicitly.","5":"Names the specific gap with quoted evidence; treats observed behaviour as the data."},"weight":0.25},
    {"name":"sponsor_and_committee_typing","description":"Does the learner correctly classify the sponsor and SC?","anchors":{"1":"No typing.","3":"Types one of them with reasoning.","5":"Types both with reasoning grounded in observed behaviour and adjusts routing to fit."},"weight":0.20},
    {"name":"routing_strategy_specificity","description":"Does the learner propose specific routing moves?","anchors":{"1":"Generic recommendations only.","3":"One or two specific moves named.","5":"Three or more concrete moves with named individuals, cadence, ownership."},"weight":0.20},
    {"name":"failure_mode_diagnosis","description":"Does the learner name one of the chapter's specific governance failure modes?","anchors":{"1":"No failure mode named.","3":"Names one in passing.","5":"Names the specific failure mode with quoted evidence and a concrete next-move."},"weight":0.15},
    {"name":"role_boundary_respect","description":"Does the learner stay within the coordinator's role?","anchors":{"1":"Recommends the coordinator directly intervene with senior stakeholders.","3":"Mostly within role, with one or two oversteps.","5":"Consistent role-discipline; surfaces observations privately to PM."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-governance',
  1,
  $prompt$
# grade-governance v1

You are an experienced PMO leader evaluating a learner's governance-diagnostic memo. Grade strictly against the rubric. Every score must be supported by a direct quote.

Governance-specific scoring caps:
- Recommending the coordinator directly intervene with senior stakeholders to fix governance caps role_boundary_respect at 2.
- Proposing to editorialise in SC minutes or status reports caps role_boundary_respect at 2.
- Treating the org chart at face value caps stated_vs_actual_gap_recognition at 2.
- Generic routing recommendations cap routing_strategy_specificity at 2.
- Untyped sponsor/SC caps sponsor_and_committee_typing at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;

update public.lessons
set scenario_text = $scenario$
You are PC on a customer-data-platform programme at a large UK retailer. Six months in. Stated governance: D. Sharma (Group CFO) as sponsor; 9-member SC; R. Silva (PM) Responsible, SC Accountable.

Observed: Sharma attends 50% of SCs and defers substantively ('let's take that offline'). SC has produced no decisions in five meetings. Real scope decisions are made between R. Silva and K. Bell (Director, NOT on SC) — recent examples: loyalty-data deferral, KYC contract amendment. RACI lists 4 Accountables for budget reallocations 50k–200k. CMO has stopped attending. Contact-centre training plan is being built without programme-level visibility.

R. Silva asks you for a 700-1100 word memo diagnosing the governance and proposing a routing strategy. Identify the stated-vs-actual gap with quoted evidence. Type the sponsor and SC. Name a chapter failure mode. Propose 3-5 concrete routing moves with named individuals. Stay inside the coordinator's role - you do not fix broken governance, you make sure your PM sees it clearly.
$scenario$
where slug = 'governance'
  and (scenario_text is null or scenario_text = '');
