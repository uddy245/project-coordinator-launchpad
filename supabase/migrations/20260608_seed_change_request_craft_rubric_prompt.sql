-- Seed the change_request_craft rubric + grade-cr prompt for Lesson 14.
-- File dated 20260608 — strict lex order after 20260607 (Lesson 13).
--
-- Lesson 14 ("change-requests") is a new lesson; covers handbook Ch 15
-- (Lesson 14 = Ch 15 because Ch 14 / RAID is already covered by the
-- existing canonical Lesson 20 / risk_identification).
--
-- This migration:
--   - inserts the lesson row (competency + prompt_name set per A1 pattern)
--   - inserts the change_request_craft rubric (5 dimensions)
--   - inserts the grade-cr prompt (with nine scoring caps)
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/change-request-craft-v1.json
--   docs/prompts/grade-cr-v1.md
--   docs/lessons/change-requests.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.
--
-- Idempotent via the (slug), (competency, version) and (name, version)
-- unique constraints. Re-applying is a no-op.

-- --------------------------------------------------------------------------
-- Lesson 14 — Change Requests
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
  'change-requests',
  14,
  'Change Requests — Controlling Chaos Without Becoming the Blocker',
  'How to audit a flawed CR draft for five-variable impact analysis completeness, correct routing tier, surfaced political trade-offs, alternatives and recommendation, and reconciliation against the change log.',
  $scenario$
You are PC on a nine-month customer-portal rebuild for a mid-size utility company. Sponsor: VP Customer Experience. End of month four. Go-live target: end of Q3.

You maintain the change log. Across four months the log has THREE entries (two PM-approved formatting tweaks, one rejected proposal). On a project of this scope you'd expect 8-12 entries by now. You have a quiet suspicion changes are being absorbed off the log.

This morning M. Reyes (Self-Service workstream lead) sent you a CR draft for review before he sends it to L. Hassan (PM) for approval today.

THE CR DRAFT (CR-2024-004):
Submitted by: M. Reyes. WHAT: Add customer-tags feature to self-service portal (custom tags like "vacation home", "primary residence" for multi-property accounts). WHY: A. Wong (Residential Customer Manager) and J. Patel (new Commercial Accounts Lead, 3 weeks in) asked for it. IMPACT: ~8 person-days self-service dev. No other impact expected. APPROVAL REQUESTED: PM approval (L. Hassan). Tier 1 (small change).

Background you have observed (contradicts/extends the CR):
- Self-service workstream is currently on Q3 critical path. Dev team at full capacity.
- 8 days is dev-only. A complete estimate includes UX (tag interface design), QA (test scripts), accessibility review (WCAG-AA), data migration (customer table schema), integration testing (CRM read-write). Your back-of-envelope: 25-40 person-days across teams.
- Customer-tags was deliberately excluded from scope in June 2024 by V. Bauer (then CDO, predecessor stakeholder) because of CRM downstream complications the project didn't have budget to address.
- The CRM team (R. Singh, external) was NOT consulted. CRM-side schema changes need their separate change board (typical lead time 4-6 weeks).
- J. Patel is new (3 weeks) and may not know the V. Bauer history. A. Wong has been on the project from the start and would know — worth understanding why she hasn't raised it.
- Your documented thresholds: Tier 1 = under 5 person-days AND no external dependencies AND no critical-path impact. Tier 2 = under 15 days OR modest external deps. Tier 3 = Steering, anything beyond. This CR's 8-day single-team estimate alone exceeds Tier 1; the 25-40 cross-team + CRM external dep + critical path makes it Tier 3.

Your review note — 500-800 words — should:

1. Audit the impact analysis against the five-variable framework (scope, schedule, cost, quality, risk). Name missing variables and what specific data to ask M. for.

2. Assess routing tier. Is Tier 1 correct given magnitude? What tier does the framework actually call for?

3. Surface political trade-offs (who pays for capacity displacement, V. Bauer prior-scope history, J. Patel vs A. Wong asymmetry). How should M. surface these in the CR before it goes to L.?

4. Catch absence of alternatives and clear recommendation. What alternatives should M. consider? What recommendation should the CR carry?

5. Address the change log — three entries in four months. What does it signal? What should you raise with L. (separately from this CR) about silent absorption?

Do not rewrite M.'s CR. Audit it.
  $scenario$,
  60,
  true,
  'change_request_craft',
  'grade-cr'
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
-- change_request_craft rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'change_request_craft',
  1,
  $rubric$
{
  "rubric_id": "change-request-craft-v1",
  "rubric_version": "1.0.0",
  "competency": "change_request_craft",
  "competency_label": "Change Request Craft - Impact, Routing, Politics, Log",
  "lesson_ref": "change-requests",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"impact_analysis_completeness","description":"Does the learner audit the CR against the five-variable framework (scope/schedule/cost/quality/risk)?","anchors":{"1":"Accepts single-variable analysis.","3":"Catches 2-3 missing variables.","5":"Audits all five with specific questions and quantification asks."},"weight":0.20},
    {"name":"routing_tier_judgment","description":"Does the learner classify against the three-tier framework and catch routing errors?","anchors":{"1":"No routing analysis.","3":"Names tier mismatch without proposing correct tier.","5":"Classifies with specific magnitude criteria; identifies correct tier; explains under-routing."},"weight":0.20},
    {"name":"politics_surfacing","description":"Does the learner make implicit trade-offs explicit (who pays / loses / what was committed)?","anchors":{"1":"Accepts CR's cost-neutral framing.","3":"Names one political question without addressing.","5":"Names specific trade-offs; proposes how to surface before approval meeting."},"weight":0.20},
    {"name":"alternatives_and_recommendation","description":"Does the learner catch absence of alternatives AND recommendation?","anchors":{"1":"Accepts single-path CR.","3":"Flags one gap.","5":"Catches both; proposes specific alternatives and asks for recommendation with reasoning."},"weight":0.20},
    {"name":"change_log_and_provenance","description":"Does the learner address the log and silent-absorption pattern?","anchors":{"1":"No log mention.","3":"Names log without addressing silent absorption.","5":"Names silent-absorption pattern; proposes reconciliation and separate raise with PM."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-cr prompt v1
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-cr',
  1,
  $prompt$
# grade-cr v1

You are an experienced PMO leader evaluating a learner's audit of a flawed change request draft. Grade strictly against the rubric. Every score must be supported by a direct quote.

Change-request-specific scoring caps:
- Single-variable impact analysis accepted without flagging missing variables caps impact_analysis_completeness at 2.
- No routing-tier analysis or accepting proposed routing when magnitude requires escalation caps routing_tier_judgment at 2.
- Not addressing political trade-offs (who pays / loses / what was committed) caps politics_surfacing at 2.
- Not catching BOTH alternatives AND recommendation gaps caps alternatives_and_recommendation at 2.
- No change-log or silent-absorption mention caps change_log_and_provenance at 2.
- Producing a fully rewritten v2 CR (audit-vs-rewrite pattern) caps ALL FIVE dimensions at 2 each.
- Generic platitudes about "good change management" without specific reference cap multiple dims.
- Inventing failure modes not in the CR caps impact_analysis_completeness at 2.
- Endorsing silent absorption ("CR process is too heavy, just absorb the change") caps change_log_and_provenance at 1.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
