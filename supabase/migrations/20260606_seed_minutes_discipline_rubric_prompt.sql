-- Seed the minutes_discipline rubric + grade-minutes prompt for Lesson 12.
-- File dated 20260606 — strict lex order after 20260605 (Lesson 11).
--
-- Lesson 12 ("minutes") is a new lesson (not previously seeded).
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the minutes_discipline rubric (5 dimensions)
--   - inserts the grade-minutes prompt (with ten scoring caps)
--
-- Sourced from Chapter 12 of the project_coordinator_handbook
-- (Minutes, Actions, and Decisions: The Written Record).
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/minutes-discipline-v1.json
--   docs/prompts/grade-minutes-v1.md
--   docs/lessons/minutes.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 12 — Minutes, Actions, and Decisions
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
  'minutes',
  12,
  'Minutes, Actions, and Decisions — The Written Record',
  'How to audit a flawed minutes draft for structural correctness, action specificity, attribution and register, action-tracker discipline, and distribution / correction posture — without rewriting the document yourself.',
  $scenario$
You are PC on a twelve-month payments-platform consolidation programme for a national insurance carrier. Sponsor is the CFO. End of month six. The regular minute-taker (you) was on leave the week of the last CCB. A junior coordinator (J. Park, 8 weeks on the team) took the minutes and sent his draft today — five days after the CCB — asking for feedback before sending.

J.'s DRAFT (excerpts):

Date: Last Wednesday. Taken by: J. Park.
Attendees: L. Hassan (PM), F. Demir (Tech), M. Rivera (Procurement), V. Bauer (CDO sponsor rep), K. Olafsson (Security, dialled in), R. Singh (Vendor — Acme Payments). Absent (no apologies): P. Nakamura (Compliance), Y. Mbeki (Ops).

CR-2024-031 — Add support for SEPA Instant: "The team had a great discussion. F. Demir walked through technical implications which were really interesting. There were some concerns about the integration sprint but the team agreed benefits outweighed risks. V. Bauer was supportive and emphasized strategic priority. K. Olafsson raised some security concerns but these were considered manageable. Decision: Approved (subject to some conditions). The team will work out conditions and confirm. R. Singh confirmed Acme can support but timeline needs discussion. Action: Someone to follow up with R. Singh."

CR-2024-032 — Defer multi-currency to phase 2: "This was contentious. V. Bauer pushed back strongly, expressing frustration. M. Rivera defended the deferral. The discussion got quite heated. The team agreed to defer to phase 2 with V. Bauer to brief the CFO. Some discussion about whether this needs steering ratification but no clear conclusion. Decision: Deferred to phase 2 (tentative). Action: V. Bauer to brief CFO. M. Rivera to update vendor. TBD — whether this goes to steering."

CR-2024-033 — Increase vendor support hours: "Quicker discussion. R. Singh proposed 200→300 monthly hours at £8k/month additional. Everyone was on board. F. Demir thought it was a great move. L. Hassan said she would handle the contractual side. Decision: Approved. Actions: Update SOW (L. Hassan). TBD — start date."

AOB: P. Nakamura was absent and we did not have her compliance input. Y. Mbeki also absent. Meeting ran 25 minutes over.

Distribution: L. Hassan, F. Demir, M. Rivera, V. Bauer, K. Olafsson, J. Park (6 people).

J.'s notes to you: "Wasn't 100% sure on a couple of decisions. CR-031 conditions — I think L. Hassan said something but I missed it. CR-032 steering question is genuinely unclear. Also I was going to leave in F. Demir's comments about team growing because it's nice — let me know if I should take it out."

Your review note — 500-800 words — should:

1. Audit structural correctness against the three-section format (Decisions / Actions / Notes). Identify narrative prose to cut.

2. Audit each action for owner / due / specificity / status. Resolve the TBDs with concrete moves before sending.

3. Audit attribution ("team agreed" when K. Olafsson raised concerns; "everyone on board" with Y. Mbeki absent) and register (evaluative phrasing throughout).

4. Address the living-artifact discipline — action tracker, pre-meeting review, TBD resolution before sending.

5. Address timing (5 days late), distribution (excludes absent attendees and vendor), and the transparent-correction posture.

Do not rewrite J.'s draft as a finished v2. Audit it. He asked for feedback before sending.
  $scenario$,
  60,
  true,
  'minutes_discipline',
  'grade-minutes'
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
-- minutes_discipline rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'minutes_discipline',
  1,
  $rubric$
{
  "rubric_id": "minutes-discipline-v1",
  "rubric_version": "1.0.0",
  "competency": "minutes_discipline",
  "competency_label": "Minutes Discipline - Decisions, Actions, Attribution, Durable Record",
  "lesson_ref": "minutes",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"structural_correctness","description":"Does the learner audit against the three-section format (Decisions/Actions/Notes) and identify narrative prose to cut?","anchors":{"1":"Accepts narrative as fine.","3":"Names mixing of discussion and decisions; partial format critique.","5":"Audits against three-section format; identifies specific narrative to cut; proposes restructuring."},"weight":0.20},
    {"name":"action_specificity","description":"Does the learner audit each action for owner / due / specificity / status, and resolve TBDs before sending?","anchors":{"1":"Accepts vague actions as fine.","3":"Flags 1-2 actions; doesn't systematically audit or address TBDs.","5":"Audits every action; proposes specific rewrites; resolves TBDs with concrete moves."},"weight":0.20},
    {"name":"attribution_and_register","description":"Does the learner catch BOTH loose attribution (team agreed = unanimous) AND evaluative phrasing?","anchors":{"1":"Accepts both.","3":"Catches one of two.","5":"Catches both with specific instances and neutral rewrites."},"weight":0.20},
    {"name":"living_artifact_discipline","description":"Does the learner address action tracker, pre-meeting review, TBD resolution before sending?","anchors":{"1":"Treats minutes as deliverable in themselves.","3":"Names follow-up or TBD resolution without proposing tracker discipline.","5":"Proposes running tracker; pre-meeting review as first agenda item; chase-privately; resolve TBDs before sending."},"weight":0.20},
    {"name":"correction_and_distribution_judgment","description":"Does the learner address timing, distribution, and correction posture?","anchors":{"1":"Accepts 5-day delay; no distribution or correction mention.","3":"Raises one of three.","5":"All three: timing with apology-line move; distribution to absent attendees and vendor; transparent-correction posture."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-minutes prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-minutes',
  1,
  $prompt$
# grade-minutes v1

You are an experienced PMO leader evaluating a learner's audit of a flawed CCB minutes draft. Grade strictly against the rubric. Every score must be supported by a direct quote.

Minutes-discipline-specific scoring caps:
- Accepting narrative prose as fine, or not naming the three-section format, caps structural_correctness at 2.
- Accepting vague actions without flagging owner/due/specificity gaps caps action_specificity at 2.
- Not addressing TBDs as incomplete-meeting signals to resolve before sending caps action_specificity at 2.
- Not catching BOTH loose attribution AND evaluative phrasing caps attribution_and_register at 2.
- Treating minutes as the deliverable with no tracker/follow-up/TBD-resolution caps living_artifact_discipline at 2.
- No mention of timing, distribution, or correction posture caps correction_and_distribution_judgment at 2.
- Producing a fully rewritten v2 minutes document (audit-vs-rewrite pattern) caps ALL FIVE dimensions at 2 each — the v2-as-finished-product replaces the analytical deliverable.
- Generic platitudes about "good documentation" without specific draft reference cap multiple dims.
- Inventing failure modes not in the draft caps structural_correctness at 2.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
