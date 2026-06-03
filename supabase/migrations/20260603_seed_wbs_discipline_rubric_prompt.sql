-- Seed the wbs_discipline rubric + grade-wbs prompt for Lesson 9.
--
-- Lesson 9 ("wbs") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the wbs_discipline rubric (5 dimensions)
--   - inserts the grade-wbs prompt (with eight scoring caps)
--
-- Sourced from Chapter 9 of the project_coordinator_handbook
-- (The Work Breakdown Structure: How to Actually Build One).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/wbs-discipline-v1.json
--   docs/prompts/grade-wbs-v1.md
--   docs/lessons/wbs.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 9 — Work Breakdown Structure
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug,
  number,
  title,
  summary,
  scenario_text,
  estimated_minutes,
  is_published,
  competency,
  prompt_name
)
values (
  'wbs',
  9,
  'The Work Breakdown Structure — How to Actually Build One',
  'How to audit a WBS against the 100% rule, distinguish deliverables from activities, and recognise that the artefact''s real value is the shared model the team builds together.',
  $scenario$
You are PC on a nine-month branch-systems modernisation programme for a regional credit union. The project replaces the front-counter teller application across 84 branches, integrates with the existing core banking platform, and migrates customer records into a new servicing layer. Sponsor is the COO. Go-live target is Q4. You are in week three.

Your PM (T. Adeyemi) authored a draft WBS over the weekend, alone, and sent it to you Monday morning: "Have a look before our 1:1 on Wednesday and tell me what you think. I want to baseline this by end of week so we can build the schedule on top of it."

DRAFT WBS — BRANCH SYSTEMS MODERNISATION (v0.1, T. Adeyemi, weekend draft)

1.0  Branch Systems Modernisation
  1.1  Discovery and Design
    1.1.1  Interview branch managers
    1.1.2  Document current-state workflows
    1.1.3  Design future-state workflows
    1.1.4  Draft technical architecture
  1.2  Build
    1.2.1  Teller application
      1.2.1.1  Front-end build
      1.2.1.2  Back-end services
      1.2.1.3  Authentication layer
      1.2.1.4  Reporting module
      1.2.1.5  Admin console
      1.2.1.6  Data validation layer
      1.2.1.7  Error handling
    1.2.2  Core banking integration
    1.2.3  Customer records migration
  1.3  Testing
    1.3.1  Run unit tests
    1.3.2  Run integration tests
    1.3.3  Run UAT with three pilot branches
  1.4  Deployment
    1.4.1  Pilot rollout (3 branches)
    1.4.2  Wave 1 rollout (20 branches)
    1.4.3  Wave 2 rollout (30 branches)
    1.4.4  Wave 3 rollout (31 branches)

Background you have observed: the credit union runs no formal change-management function; past projects have had no dedicated training package and have absorbed training into "soft launch" time; the core banking platform team is a separate group with their own release cadence; the COO has asked T. for a budget number by end of week 5; the current operations team has indicated they do not have capacity to run hypercare after go-live; T. is a strong technical PM who told you in passing "the WBS is the easy bit — once it's right, the schedule writes itself"; the workstream leads have not yet seen the draft.

Your PM wants a review note — 500-800 words — that:

1. Audits the draft against the 100% rule. Name specific categories of work missing (PMO overhead, change management, training, documentation, transition to operations, hypercare/warranty, closure) and tie each to the gap in the draft.

2. Reviews the existing leaves for the activity-vs-deliverable distinction. Identify the leaves framed as activities rather than deliverables, and propose deliverable-form rewrites.

3. Comments on decomposition. Are the leaves at the right granularity (8/80 rule)? Are the branches at consistent depth? Which packages should be decomposed further, which consolidated.

4. Notes the cross-artefact implications — for at least two gaps, name the downstream artefact (schedule, budget, RAM, risk register, reporting) that will absorb the omission and what the practical cost will be.

5. Proposes the validation move you would recommend before T. baselines. The draft was authored solo. The workstream leads have not seen it. What is the right way to get from this draft to a baselined WBS the doers believe? Name the format, the participants, the duration, and the coordinator's specific jobs in that session.

Do not rewrite the WBS yourself. Do not declare T.'s draft wrong. You are doing the noticing T. asked for.
  $scenario$,
  60,
  true,
  'wbs_discipline',
  'grade-wbs'
)
on conflict (slug) do update
  set title = excluded.title,
      summary = excluded.summary,
      scenario_text = excluded.scenario_text,
      estimated_minutes = excluded.estimated_minutes,
      is_published = excluded.is_published,
      competency = excluded.competency,
      prompt_name = excluded.prompt_name,
      updated_at = now();

-- --------------------------------------------------------------------------
-- wbs_discipline rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'wbs_discipline',
  1,
  $rubric$
{
  "rubric_id": "wbs-discipline-v1",
  "rubric_version": "1.0.0",
  "competency": "wbs_discipline",
  "competency_label": "WBS Discipline - Decomposition, Coverage, and the Shared Model",
  "lesson_ref": "wbs",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"hundred_percent_rule_compliance","description":"Does the learner audit the WBS against the 100% rule and name the chapter's commonly-omitted categories (PMO overhead, change mgmt, training, documentation, transition, hypercare, closure)?","anchors":{"1":"Accepts WBS as complete; no named omissions.","3":"Names 2-3 omission categories with examples.","5":"Names 4+ omission categories tied to specific gaps with practical consequence."},"weight":0.25},
    {"name":"deliverable_orientation","description":"Does the learner identify activity-vs-deliverable inversions and propose deliverable-form rewrites?","anchors":{"1":"Does not address the distinction, or replicates activity-orientation in own suggestions.","3":"Names the distinction; rewrites 1-2 leaves; tolerates remaining activities.","5":"Names the distinction with chapter framing; audits every problematic leaf; proposes rewrites for each."},"weight":0.20},
    {"name":"decomposition_quality","description":"Does the learner reason about 8/80 depth, consistency across branches, and single-owner assignability?","anchors":{"1":"Not addressed, or proposes maximum depth without 8/80 reference.","3":"Names 8/80 or consistency and applies to 1-2 branches.","5":"Audits both depth AND consistency; connects to single-owner assignability; stops decomposing where unhelpful."},"weight":0.20},
    {"name":"cross_artifact_traceability","description":"Does the learner trace WBS gaps forward into schedule/budget/RAM/risk/reporting?","anchors":{"1":"Treats WBS as standalone; no downstream artefacts.","3":"Names 1-2 downstream artefacts without specific linkage.","5":"For 2+ gaps, traces specific downstream artefact, symptom, and cost."},"weight":0.15},
    {"name":"collaborative_process_recognition","description":"Does the learner recognise the shared-model framing and propose specific team-validation moves?","anchors":{"1":"Treats WBS as deliverable to polish; doesn't raise solo-author concern; or proposes coordinator rewrites it.","3":"Notes team validation would be useful without specific format.","5":"Proposes specific validation move with format/participants/duration; names coordinator's three workshop jobs; frames artefact-is-residue distinction."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-wbs prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-wbs',
  1,
  $prompt$
# grade-wbs v1

You are an experienced PMO leader evaluating a learner's critique-and-restructure of a draft work breakdown structure. Grade strictly against the rubric. Every score must be supported by a direct quote.

WBS-discipline-specific scoring caps:
- Accepting the draft as complete, or flagging only one generic gap without naming the chapter's omission categories (PMO, change mgmt, training, documentation, transition, hypercare, closure), caps hundred_percent_rule_compliance at 2.
- Proposing additional leaves that are themselves activities ("hold weekly status meetings", "review proposals", "draft minutes") caps deliverable_orientation at 2.
- Failing to name the activity-vs-deliverable distinction at all caps deliverable_orientation at 2.
- Decomposition critique that ignores either 8/80 OR consistency-across-branches caps decomposition_quality at 2.
- WBS treated as standalone with no schedule/budget/RAM/risk/reporting mention caps cross_artifact_traceability at 2.
- Accepting solo-authored provenance without team-validation, OR proposing coordinator rewrite the WBS, caps collaborative_process_recognition at 2.
- Generic platitudes about team involvement without specific format cap collaborative_process_recognition at 2.
- Inventing failure modes not in the draft caps hundred_percent_rule_compliance at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
