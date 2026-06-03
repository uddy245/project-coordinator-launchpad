-- Seed the schedule_literacy rubric + grade-schedule prompt for Lesson 10.
-- File dated 20260604 (not 20260603) to sort strictly after the same-day
-- wbs_discipline migration — supabase enforces lex order on migration names.
--
-- Lesson 10 ("schedules") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the schedule_literacy rubric (5 dimensions)
--   - inserts the grade-schedule prompt (with nine scoring caps)
--
-- Sourced from Chapter 10 of the project_coordinator_handbook
-- (Schedules, Dependencies, and the Critical Path).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/schedule-literacy-v1.json
--   docs/prompts/grade-schedule-v1.md
--   docs/lessons/schedules.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 10 — Schedules, Dependencies, and the Critical Path
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
  'schedules',
  10,
  'Schedules, Dependencies, and the Critical Path',
  'How to audit a schedule against evidence rather than assertion, identify the current critical path, surface hidden external/resource/decision dependencies, and produce a status narrative that treats the sponsor as capable of hearing bad news.',
  $scenario$
You are PC on a six-month regulatory-reporting platform replacement for a wholesale bank. Sponsor is the CCO. Go-live target: 30 September. End of month three. Your PM (S. Park) sent you the schedule snapshot below: "Before I present this to steering on Friday, give it your honest read — I want to know what I am missing."

SCHEDULE SNAPSHOT — REGSTREAM (end month 3, week 12)
Reported overall completion: 71%. Reported end date: 30 September. Buffer: 3 weeks named originally, 2 weeks remaining.

WP-01 Discovery & design — 100% GREEN (closed)
WP-02 Vendor contract — 100% GREEN (closed)
WP-03 Integration spec — 95% GREEN (lead: J. Okafor)
WP-04 Tier 1 config — 78% GREEN (lead: M. Reyes)
WP-05 Tier 2 config — 62% AMBER (depends on WP-04 sign-off)
WP-06 Warehouse build — 80% GREEN (lead: J. Okafor)
WP-07 ETL pipelines — 45% AMBER (lead: A. Singh, depends on WP-06)
WP-08 Test env provisioning — 60% AMBER (depends on infra team)
WP-09 UAT prep — 10% GREEN (start 1 Aug)
WP-10 Regulator pre-submission review — 0% GREEN (start 1 Sep)
WP-11 Go-live — 0% GREEN (start 15 Sep)

Original critical path: WP-01 → WP-03 → WP-04 → WP-09 → WP-10 → WP-11.

Background observed: WP-04 reported by M. Reyes stepping up 2-3 points every Friday for six weeks. WP-06 at 80% with 62% hours consumed; WP-07 at 45% with 72% hours consumed. A. Singh said privately "we'll catch up only if WP-06 stops changing." WP-08 depends on infra team which has said "we'll get to it" for three weeks; no committed date. WP-10 needs FCA reviewer availability in early September; procurement reached out a month ago, no confirmation. Week-8 architecture board declined the original native-REST integration pattern and asked for message-queue; team accepted; schedule not rebaselined. CCO has hard regulatory deadline 1 October.

Your PM wants a review note — 500-800 words — that:

1. Identifies the current critical path through the snapshot and notes whether it has shifted from original.

2. Audits reported percentages against evidence. Names which packages you trust at face value and which you do not, and what evidence would verify each.

3. Categorises dependencies missing or under-named in the snapshot using internal/external/resource/decision categories.

4. Tracks buffer consumption explicitly — how much consumed where, and whether buffer is burning faster than work.

5. Produces a short, evidence-backed status narrative (3-5 sentences) S. could use at Friday steering. Name what slipped, the cause, the downstream effect, whether 30 September is at risk.

Do not rewrite the schedule. Do not redraft work packages. Audit the snapshot. S. asked what she is missing — that is the deliverable.
  $scenario$,
  60,
  true,
  'schedule_literacy',
  'grade-schedule'
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
-- schedule_literacy rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'schedule_literacy',
  1,
  $rubric$
{
  "rubric_id": "schedule-literacy-v1",
  "rubric_version": "1.0.0",
  "competency": "schedule_literacy",
  "competency_label": "Schedule Literacy - Critical Path, Honest Status, and the Verification Discipline",
  "lesson_ref": "schedules",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"critical_path_awareness","description":"Does the learner identify the current critical path, distinguish critical from off-path slips, and recognise the path can shift?","anchors":{"1":"No critical-path identification; all slips treated equally.","3":"Names critical path or one-two critical activities; distinguishes one slip as more consequential.","5":"Walks current critical path, names activities on it, distinguishes critical vs off-path slips, notes any shift from original."},"weight":0.25},
    {"name":"dependency_categorization","description":"Does the learner categorise dependencies by source (internal/external/resource/decision) and surface missing ones?","anchors":{"1":"Only internal task-to-task or none.","3":"Names two categories with one specific example.","5":"Names three or four categories with specific examples; calls out what schedule is hiding."},"weight":0.20},
    {"name":"evidence_vs_assertion_discipline","description":"Does the learner treat reported percentages skeptically and cross-check against actuals?","anchors":{"1":"Accepts percentages at face value.","3":"Names one-two soft numbers; passing mention of actuals.","5":"Systematically distinguishes evidence-backed from asserted; cross-checks actuals; proposes binary tracking."},"weight":0.20},
    {"name":"buffer_and_slack_management","description":"Does the learner track buffer explicitly and distinguish slack absorption from buffer drawdown?","anchors":{"1":"Buffer not addressed; slack and buffer interchangeable.","3":"Notes 1-2 slips have consumed buffer; distinguishes one off-path slip.","5":"Tracks consumption explicitly; calls out buffer-burning-faster-than-work; proposes how PM should report buffer state."},"weight":0.15},
    {"name":"schedule_communication","description":"Does the learner produce a precise evidence-backed status narrative naming slip/cause/downstream/end-date?","anchors":{"1":"Vague reassurance, soft language, or Gantt-without-narrative.","3":"Names one slip and cause; mixes reassurance with reporting.","5":"Short evidence-backed narrative names what slipped/cause/downstream/end-date impact; treats sponsor as capable of hearing bad news."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-schedule prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-schedule',
  1,
  $prompt$
# grade-schedule v1

You are an experienced PMO leader evaluating a learner's schedule audit and status narrative. Grade strictly against the rubric. Every score must be supported by a direct quote.

Schedule-literacy-specific scoring caps:
- Accepting reported percentages at face value caps evidence_vs_assertion_discipline at 2.
- Not identifying the critical path explicitly OR treating all slips as equally urgent caps critical_path_awareness at 2.
- No mention of external/resource/decision dependencies even where the snapshot exposes them caps dependency_categorization at 2.
- No tracking of buffer consumption or treating buffer and slack interchangeably caps buffer_and_slack_management at 2.
- Status narrative that hides slippage, softens with reassurance, or substitutes Gantt-description for narrative caps schedule_communication at 2.
- Status narrative produced without naming downstream effect or end-date implication caps schedule_communication at 2.
- Rewriting the schedule from scratch rather than auditing the snapshot ("here is my v2 schedule") is inventing-not-auditing — caps critical_path_awareness and evidence_vs_assertion_discipline at 2 each.
- Generic platitudes about "good schedule management" without specific schedule artefacts cap schedule_communication at 2.
- Inventing schedule facts not in the snapshot caps critical_path_awareness at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
