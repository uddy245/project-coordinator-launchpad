-- Seed the meeting_facilitation rubric + grade-meetings prompt for Lesson 11.
-- File dated 20260605 — strict lex order after 20260604 (Lesson 10).
--
-- Lesson 11 ("meetings") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the meeting_facilitation rubric (5 dimensions)
--   - inserts the grade-meetings prompt (with nine scoring caps)
--
-- Sourced from Chapter 11 of the project_coordinator_handbook
-- (Running Meetings That People Don't Hate).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/meeting-facilitation-v1.json
--   docs/prompts/grade-meetings-v1.md
--   docs/lessons/meetings.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 11 — Running Meetings That People Don't Hate
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
  'meetings',
  11,
  'Running Meetings That People Don''t Hate',
  'How to categorise a meeting by purpose type, audit an agenda for outcomes and time and owners, judge invitees and pre-reads, and propose structural redesign without overstepping.',
  $scenario$
You are PC on an eight-month e-commerce replatform programme for a national grocery retailer. Sponsor is the CDO. Your PM (L. Hassan) Slack-messaged you the tomorrow weekly status meeting invite: "Give it a look this afternoon. Also: we need to make a call on the integration vendor (Stripe vs Adyen) and I figure we have everyone in the room anyway, so I am going to add that to the agenda."

INVITE: Weekly Status — Replatform. Tomorrow 10:00-11:00 (60 min, was originally 30). Boardroom 4 + Zoom.
AGENDA: 1. Status round-robin. 2. Integration vendor discussion. 3. Q&A. 4. AOB.
INVITEES (14): L. Hassan, PC, M. Wong (Tech), S. Patel (Front-end), D. Rivera (Back-end), A. Singh (Data), I. Hartman (QA), F. Chen (UX), R. Silva (DevOps), K. Olafsson (Security), Y. Mbeki (Ops), T. Adeyemi (Programme Director), V. Bauer (CDO sponsor — optional), E. Volkov (Procurement — optional for vendor decision).
PRE-READ: None.

Background: meeting has been running 60-80 min for six weeks (originally 30); pattern is 35 min status round-robin / 10 min side discussions / 5 min Q&A recap / no AOB. S. Patel attended 1 of last 4; F. Chen declining recently. R. Silva visibly multitasking last 3. Vendor decision (Stripe vs Adyen) has been pending three weeks; technical eval done by M. Wong + A. Singh; procurement done by E. Volkov; integration sprint starts in five weeks. V. Bauer last attended two months ago; L. Hassan invited her as "good visibility ahead of the vendor decision". T. Adeyemi attends fortnightly by default. Original one-page-per-workstream pre-read practice lapsed two months ago.

Your PM wants a review note — 500-800 words — that:

1. Categorises the meeting by purpose type (decision/alignment/working) and identifies any type-conflation (status meeting being used to decide).

2. Audits the agenda item-by-item against outcome / time budget / owner with specific rewrites.

3. Audits the invitee list and pre-read situation. Who is on the list who probably should not be? Who is missing? What pre-read is needed?

4. Proposes a facilitation plan using the chapter's specific moves (start on time, state goal in first minute, redirect drift, surface dissent, close with summary, respect time budget). Tie each move to a specific risk in this setup.

5. Comments on whether the meeting should happen as designed at all. Propose a specific structural redesign if so, framed as a design change to land with L. Hassan, not as a critique.

Do not rewrite the invite, agenda, or pre-read in full. Audit the setup.
  $scenario$,
  60,
  true,
  'meeting_facilitation',
  'grade-meetings'
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
-- meeting_facilitation rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'meeting_facilitation',
  1,
  $rubric$
{
  "rubric_id": "meeting-facilitation-v1",
  "rubric_version": "1.0.0",
  "competency": "meeting_facilitation",
  "competency_label": "Meeting Facilitation - Purpose, Agenda, Participants, Discipline",
  "lesson_ref": "meetings",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"meeting_purpose_clarity","description":"Does the learner categorise by purpose type (decision/alignment/working) and catch type-conflation?","anchors":{"1":"No categorisation.","3":"Names one category; misses conflation.","5":"Categorises by type; identifies conflation; proposes split with named cost."},"weight":0.20},
    {"name":"agenda_quality","description":"Does the learner audit agenda items for outcome / time-budget / owner?","anchors":{"1":"Accepts topic-label agenda as fine.","3":"Flags 1-2 items; no systematic audit.","5":"Audits every item; proposes specific outcome-bearing rewrites."},"weight":0.20},
    {"name":"participant_and_preread_judgment","description":"Does the learner critique BOTH invitee list AND pre-read situation?","anchors":{"1":"Accepts invitee list; no pre-read mention.","3":"Raises one of two.","5":"Audits both; proposes specific changes; connects to purpose type."},"weight":0.20},
    {"name":"facilitation_plan","description":"Does the learner propose the chapter's specific facilitation moves?","anchors":{"1":"No moves or generic platitudes.","3":"Names 2-3 of chapter's moves.","5":"Names 4+ moves tied to specific risks in this meeting."},"weight":0.20},
    {"name":"meeting_design_judgment","description":"Does the learner question whether the meeting should happen as designed and propose structural redesign?","anchors":{"1":"Treats meeting as fixed input.","3":"Raises one structural question.","5":"Proposes specific tiered redesign framed as design change for PM."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-meetings prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-meetings',
  1,
  $prompt$
# grade-meetings v1

You are an experienced PMO leader evaluating a learner's audit of a meeting setup. Grade strictly against the rubric. Every score must be supported by a direct quote.

Meeting-facilitation-specific scoring caps:
- Not categorising by purpose type (decision/alignment/working) caps meeting_purpose_clarity at 2.
- Failing to catch type-conflation (status meeting being used to decide) when scenario contains one caps meeting_purpose_clarity at 2.
- Accepting topic-label agenda items as fine or not auditing every item against outcome/time/owner caps agenda_quality at 2.
- Not addressing BOTH invitee list AND pre-read situation caps participant_and_preread_judgment at 2.
- No specific facilitation moves named, or generic platitudes about "tight meetings", caps facilitation_plan at 2.
- No question of whether meeting should happen as designed, or only cosmetic changes, caps meeting_design_judgment at 2.
- Producing a fully rewritten v2 meeting setup (new invite, new agenda, new pre-read drafted in full) and recommending it go directly to the team — applying audit-vs-rewrite pattern — caps agenda_quality, participant_and_preread_judgment, and facilitation_plan at 2 each.
- Generic platitudes about "good meeting hygiene" without specific scenario reference cap multiple dims.
- Inventing failure modes not in the setup caps meeting_purpose_clarity at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
