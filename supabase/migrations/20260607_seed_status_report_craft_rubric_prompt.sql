-- Seed the status_report_craft rubric + grade-status prompt for Lesson 13.
-- File dated 20260607 — strict lex order after 20260606 (Lesson 12).
--
-- Lesson 13 ("status-reports") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the status_report_craft rubric (5 dimensions)
--   - inserts the grade-status prompt (with nine scoring caps)
--
-- Sourced from Chapter 13 of the project_coordinator_handbook
-- (Status Reports: Three Audiences, Three Reports).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/status-report-craft-v1.json
--   docs/prompts/grade-status-v1.md
--   docs/lessons/status-reports.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 13 — Status Reports
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
  'status-reports',
  13,
  'Status Reports — Three Audiences, Three Reports',
  'How to audit a flawed weekly status report for audience misfit, buried lede, voice failures (euphemism / false precision / generic risk / color washing), RAG calibration, and production workflow — without rewriting it for the PM.',
  $scenario$
You are PC on a ten-month workforce-management modernisation programme for a national logistics company. Sponsor: COO. End of month seven. Your PM (S. Park) sent the weekly status report draft below: "I drafted Friday's report on my flight last night because this week was tight. Read before noon — sending to the distribution this afternoon. COO is on distribution. Steering Monday."

THE DRAFT (4 pages):
- Executive summary: 3 paragraphs of reassurance ("solid week", "excellent progress", "outstanding dedication", "navigating challenges with vendor delivery"). No headline of state.
- Overall: GREEN. "Consistent with our reporting over the last quarter. We have been GREEN for twelve consecutive weeks."
- Workstream details (6 workstreams): all GREEN except WS-6 (Data Migration) AMBER for "extended leave".
- WS-2 Time-and-Attendance Integration: "Approximately 67% progress. Navigating challenges with vendor — vendor missed April and mid-May milestones. Next deliverable week of 17 June. Confident remains on track for Q4."
- WS-3 Mobile Rollout: "Three of four planned sites onboarded. Fourth deferred at request of regional operations manager."
- WS-4 Reporting Layer: "Progress on dashboard build. Working through requirements signed off in March."
- Key decisions this week: "Refinement of sprint backlog. Discussion of change management approach. Continued engagement with vendor on timeline."
- Key risks: "Resource availability remains a risk on the programme as ever. The vendor delivery situation on workstream 2 is being monitored. There are some ongoing discussions about the scope of the reporting layer."
- Closing note: "Thank you again to the team for an excellent week. The momentum is strong..."
- Distribution: 12 delivery team + 6 leads + 4 PM extended + COO + Programme Director + 4 business partners. Sent Friday afternoon.

Background you have observed (contradicts the report):
- WS-2 vendor has missed THREE milestones (not two). Vendor account manager admitted privately the originally-promised integration design is not technically achievable as scoped. The 67% is rolled up from optimistic estimates; your sub-task walk-through suggests closer to 50%.
- WS-6 "extended leave" is actually a three-week-old vacancy, no backfill. Migration test runs are unscheduled.
- WS-4: business has requested four additional reports outside the signed-off scope; team has been building them without routing through change control.
- WS-3: regional ops manager DECLINED the rollout citing training-package concerns. Not a scheduling preference.
- COO has not asked questions about the report in 8 weeks. T. Adeyemi: "your status reports are nice but I'm not sure what they're really telling us."
- Monday template did not go out this week. PM drafted on a flight with no lead input.
- Monday's steering is the first formal COO engagement in three months.

Your PM wants a review note — 500-800 words — that:

1. Identifies the audience-segmentation problem (one document for delivery team / PM-stakeholders / sponsor — chapter's three-audience framing).

2. Audits structure against six-section format (Headline / RAG / Workstream status / Decisions and asks / Risks / Upcoming). Identify the buried-lede failure and propose a specific headline sentence.

3. Audits voice — name the four chapter failures (euphemism, false precision, generic risk, color washing) with specific quoted instances and rewrites.

4. Audits the RAG ratings workstream-by-workstream against your operational knowledge. The 12-week green run. How would you raise the amber conversation with S.?

5. Comments on production workflow — Monday template missed, PM-drafted-on-flight, Friday afternoon send — and proposes a specific workflow for next week.

Do not rewrite the report. Audit it.
  $scenario$,
  60,
  true,
  'status_report_craft',
  'grade-status'
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
-- status_report_craft rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'status_report_craft',
  1,
  $rubric$
{
  "rubric_id": "status-report-craft-v1",
  "rubric_version": "1.0.0",
  "competency": "status_report_craft",
  "competency_label": "Status Report Craft - Audience, Structure, Voice, RAG Courage",
  "lesson_ref": "status-reports",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"audience_segmentation","description":"Does the learner identify the three-audience misfit and propose the one-source-three-packagings move?","anchors":{"1":"Treats as single document for one audience.","3":"Names three-audience framing or one misfit.","5":"Names all three audiences and proposes specific packaging per audience."},"weight":0.20},
    {"name":"structure_and_signal","description":"Does the learner audit against six-section structure and catch buried lede?","anchors":{"1":"Accepts current order.","3":"Names structure or catches one failure.","5":"Audits full structure; catches buried lede; proposes specific headline sentence."},"weight":0.20},
    {"name":"narrative_voice_discipline","description":"Does the learner catch the four voice failures (euphemism / false precision / generic risk / color washing)?","anchors":{"1":"Accepts all.","3":"Catches 1-2 with specific instances.","5":"Catches 3+ of 4 with quoted instances and neutral rewrites."},"weight":0.20},
    {"name":"rag_courage_and_calibration","description":"Does the learner audit RAG against operational state and address color washing / courage-to-go-amber?","anchors":{"1":"Accepts RAG at face value.","3":"Notes one workstream soft.","5":"Audits all workstreams systematically; names color-washing pattern; proposes amber-conversation script."},"weight":0.20},
    {"name":"preparation_and_workflow_judgment","description":"Does the learner audit production workflow and propose specific next-week rhythm?","anchors":{"1":"No workflow critique.","3":"Raises one workflow issue.","5":"Audits against Monday-template / Thursday-send rhythm; catches specific workflow failures; proposes specific next-week steps."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-status prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-status',
  1,
  $prompt$
# grade-status v1

You are an experienced PMO leader evaluating a learner's audit of a flawed weekly status report. Grade strictly against the rubric. Every score must be supported by a direct quote.

Status-report-craft-specific scoring caps:
- Treating the report as a single document for one undifferentiated audience caps audience_segmentation at 2.
- No audit against six-section structure or accepting current order with buried lede caps structure_and_signal at 2.
- Catching fewer than three of four named voice failures caps narrative_voice_discipline at 2.
- Accepting RAG at face value when operational evidence contradicts caps rag_courage_and_calibration at 2.
- Treating the report as a finished artefact without auditing production workflow caps preparation_and_workflow_judgment at 2.
- Producing a fully rewritten v2 status report (audit-vs-rewrite pattern) caps ALL FIVE dimensions at 2 each.
- Generic platitudes about "clearer communication" without specific reference cap multiple dims.
- Inventing failure modes not in the report caps structure_and_signal at 2.
- Endorsing the 12-week green run as evidence of project health (color-washing-defender) caps rag_courage_and_calibration at 1.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
