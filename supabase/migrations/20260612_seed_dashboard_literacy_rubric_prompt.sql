-- Seed the dashboard_literacy rubric + grade-dashboards prompt for Lesson 15.
-- File dated 20260612 — strict lex order after 20260610_fix_grader_prompts.
--
-- Lesson 15 ("dashboards") is a new lesson; covers handbook Ch 16
-- (Lesson 15 = Ch 16 because Ch 14 / RAID is already covered by canonical
-- Lesson 20 / risk_identification, and Lesson 14 = Ch 15 / CRs).
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/dashboard-literacy-v1.json
--   docs/prompts/grade-dashboards-v1.md
--   docs/lessons/dashboards.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.

-- --------------------------------------------------------------------------
-- Lesson 15 — Dashboards
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'dashboards',
  15,
  'Dashboards and the Uncomfortable Truth of a Project',
  'How to audit a flawed dashboard against the four-question framework, the four metric principles, and the three-audience layered approach — and bring honest colour discipline without overstepping into the PM''s call on RAG.',
  $scenario$
You are PC on an eleven-month IAM modernisation programme for a large healthcare provider. Sponsor: CISO. Go-live Q4. Month seven. Tomorrow R. Adekanmi (PM) is presenting the dashboard to steering for the first time in three months. The CISO wants 'a real view of where the programme is' before signing off Q4 go-live.

R. sent you the current dashboard mock-up: 11 metrics, all GREEN for 14 consecutive weeks. Programme completion 68%, hours burned 68%, open risks 22, defect count trending down (22→17→14), satisfaction 4.1/5, milestones 14 of 15 (93%), 6 workstreams all GREEN. One view for team + R. + CISO.

Background you have observed: 68% completion is rolled up from soft estimates, walking the underlying it's closer to 55%. Rework now 28% of monthly burn (was 8%). Risk composition shifted hard — 11 of 22 now on Federation critical path, 4 are external-vendor amber-for-nine-weeks. Defect decline reflects testing slowing down (test lead on extended sick leave, sprint velocity -40%). The slipped milestone is the only critical-path one. Satisfaction survey had 38% response rate, senior stakeholders didn't respond. Federation lead has reported GREEN for nine weeks while underlying signals deteriorate. T. Adeyemi (PMO Director) told R. privately 'the green run is making me nervous'. CISO said 'I'm not sure the dashboard is showing what we need to see'.

Your review note — 500-800 words — should:

1. Audit the dashboard against the four-question framework (objectives / pressure / what changed / senior attention).
2. Critique the metrics using activity-vs-outcome, leading-vs-lagging, composition-vs-total, trend-vs-snapshot. Propose specific replacements.
3. Address the one-dashboard-for-three-audiences problem. Propose the three-layer split.
4. Address the 14-week persistent-green pattern with both colour-by-threshold AND PM-judgment-override.
5. Frame the coordinator role going forward — verify-before-publish, drop noise / add signal, translate between layers, don't-hide-behind-the-dashboard. How would you raise Federation's amber-going-red situation with R. before steering?

Do not redesign the dashboard for R. Audit it.
  $scenario$,
  60,
  true,
  'dashboard_literacy',
  'grade-dashboards'
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
-- dashboard_literacy rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'dashboard_literacy', 1,
  $rubric$
{
  "rubric_id": "dashboard-literacy-v1",
  "rubric_version": "1.0.0",
  "competency": "dashboard_literacy",
  "competency_label": "Dashboard Literacy - Honest Metrics, Layered Audiences, Discomfort Test",
  "lesson_ref": "dashboards",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"four_questions_audit","description":"Does the learner audit against the chapter's four questions (objectives / pressure / what changed / senior attention)?","anchors":{"1":"No four-question audit.","3":"Names 2-3 questions; identifies one unanswered.","5":"Audits all four; names which metric or absence makes the case; references 'decoration' framing."},"weight":0.20},
    {"name":"metric_quality_critique","description":"Does the learner apply the four principles (activity-vs-outcome, leading-vs-lagging, composition-vs-total, trend-vs-snapshot)?","anchors":{"1":"All metrics treated as equivalent.","3":"Names 1-2 principles applied to one metric.","5":"Names 3+ principles systematically with specific replacements."},"weight":0.20},
    {"name":"audience_layer_judgment","description":"Does the learner recognise one-dashboard-for-all-audiences and propose the three-layer split?","anchors":{"1":"Treats as single artefact.","3":"Names three-audience framing or identifies one misfit.","5":"Names all three with content/cadence/owner and addresses translate-between-layers consistency."},"weight":0.20},
    {"name":"honest_color_discipline","description":"Does the learner catch persistent-green-as-lie-by-omission and propose both threshold AND PM-override mechanisms?","anchors":{"1":"Accepts persistent green as health.","3":"Names persistent-green or one mechanism.","5":"Names lie-by-omission with chapter framing; proposes both mechanisms; references discomfort test."},"weight":0.20},
    {"name":"coordinator_role_posture","description":"Does the learner take the chapter's coordinator practices (verify / change / translate / don't-hide)?","anchors":{"1":"No posture; treats dashboard as fixed input or proposes hiding behind it.","3":"Names 1-2 practices.","5":"Names 3+ with specific application; demonstrates 'coordinators who insist on honest dashboards become the ones whose reports get trusted' posture."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-dashboards prompt v1 — FULL BODY WITH PLACEHOLDERS
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-dashboards', 1,
  $prompt$
# grade-dashboards v1

You are an experienced PMO leader evaluating a learner's audit of a flawed project dashboard. Grade strictly against the rubric. Every score must be supported by a direct quote.

# Rubric

{{rubric_json}}

# Scenario

{{scenario_text}}

# Submission

{{submission_text}}

# Task

Per dim: 1-5 score, one-sentence justification with verbatim quote, the quote, one specific improvement suggestion.

Rules:
- Empty/off-topic: 1 across with explicit justification.
- Never 5 unless every 5-anchor indicator is present.
- Quote verbatim. No exact quote: at most 2.

Dashboard-literacy-specific scoring caps:
- Treating the dashboard as a fixed input without auditing against the four-question framework caps four_questions_audit at 2.
- No principle-based metric critique caps metric_quality_critique at 2.
- Treating as single artefact for one audience caps audience_layer_judgment at 2.
- Not addressing persistent-green or only one of threshold/PM-override mechanisms caps honest_color_discipline at 2.
- Endorsing the 14-week green run as evidence of project health caps honest_color_discipline at 1.
- No coordinator-role posture caps coordinator_role_posture at 2.
- Proposing to hide behind the dashboard (deflecting senior questions to it) caps coordinator_role_posture at 1.
- Producing a fully rewritten v2 dashboard caps ALL FIVE dims at 2 each.
- Generic platitudes about "data-driven decisions" or "executive insights" without specific reference cap multiple dims.
- Inventing failure modes not in the dashboard caps four_questions_audit at 2.

Temperature 0; deterministic grading.

After all dims:
- overall_competency_score = weighted average.
- pass = true iff every dim score >= 3.
- hire_ready = true iff overall >= 4.

Call record_rubric_scores exactly once.
  $prompt$,
  true
)
on conflict (name, version) do nothing;
