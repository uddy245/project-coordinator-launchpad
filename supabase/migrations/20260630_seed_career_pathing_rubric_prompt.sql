-- Seed the career_pathing rubric + grade-career prompt for Lesson 25.
-- File dated 20260630 — strict lex order after 20260629_seed_ai_tool_judgment_rubric_prompt.
--
-- Lesson 25 ("coordinator-to-pm") covers handbook Ch 25 (The Path From
-- Coordinator to PM). Closes Part V and the book. Graded via a development-
-- conversation artifact (the schema requires a competency + prompt per
-- lesson, so this closing reflection is delivered as a graded development
-- conversation rather than reading-only).
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/career-pathing-v1.json
--   docs/prompts/grade-career-v1.md
--   docs/lessons/coordinator-to-pm.md (Read tab)

insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'coordinator-to-pm',
  25,
  'The Path From Coordinator to PM (and Whether to Take It)',
  'How to decide whether to move toward a PM role - the honest questions about accountability, political exposure, and being publicly wrong; understanding that PM is a role change (support vs own), not a promotion; building the new skills deliberately through stretch responsibilities and mentoring; and approaching the development conversation with self-aware agency rather than title-chasing or passive deferral.',
  $scenario$
You've been a project coordinator for about three years, the last eleven months on the IAM modernisation programme under your PM, R. Adekanmi. R. has been a good boss and has noticed your work. In your next one-on-one she's said she wants to talk about 'where you want to go' - and you know she's asking, in effect, whether you want to move toward a PM role, and how she can help.

You have a week to think about it before that conversation. What you actually want isn't fully settled. Some things you've noticed about yourself over three years: you genuinely enjoy the craft of the artifacts - a clean status report, well-run minutes, a critical-path check - and you find the judgment moments (watching R. handle a tense sponsor call, a difficult escalation) more fascinating than draining. You're less sure about carrying the accountability yourself: being the one the steering committee waits on, the one who owns a wrong call publicly. You don't have direct experience of sponsor management, strategic framing, or holding a project together when it's going badly - those have been R.'s job, observed from the side.

Write the preparation for your development conversation with R. - what you'll actually say to her. It can be in the form of notes you'd bring or the message of what you'd say. Your answer should:

1. Engage the honest questions genuinely - do you want the accountability, the political exposure, less artifact-craft and more people-work, the experience of being wrong publicly? Reason from your own evidence (what's energised vs drained you). A reasoned 'yes,' 'no,' or 'not yet' are all valid; an un-examined answer is not.
2. Show you understand PM is a role CHANGE, not a promotion - a coordinator supports, a PM owns - and that some skills (sponsor management, accountability under pressure, strategic framing) have to be built new, so being a good coordinator is necessary but not sufficient.
3. Propose concrete, well-judged development steps that build the right new skills - stretch responsibilities, owning something small end-to-end, a mentor, intentional observation - sized appropriately.
4. Own the decision with agency and realism - make a defensible choice (toward PM, toward senior-IC/specialist, or not-yet) and be clear-eyed about its real costs.
5. Frame it as a professional development conversation with R. - a thoughtful reflection plus a specific, reasonable ask - not a demand for the title and not a passive 'whatever you think.'

Do not chase the title for its own sake, and do not abdicate the decision to R. or the company.
  $scenario$,
  60,
  true,
  'career_pathing',
  'grade-career'
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

insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'career_pathing', 1,
  $rubric$
{
  "rubric_id": "career-pathing-v1",
  "rubric_version": "1.0.0",
  "competency": "career_pathing",
  "competency_label": "Career Pathing - The Coordinator-to-PM Decision and the Development Conversation",
  "lesson_ref": "coordinator-to-pm",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"honest_self_assessment","description":"Engages the honest questions (accountability, political exposure, artifact-vs-people, public wrongness) from the learner's own evidence, reaching a reasoned yes/no/not-yet - rather than title-chasing or abdicating?","anchors":{"1":"No real self-assessment - wants the title because it's next (title-chasing), or abdicates ('whatever the company wants').","3":"Engages some honest questions but partially, or asserts a direction without grounding it in their own evidence.","5":"Works the honest questions against their own experience and reaches a reasoned, self-aware position - yes, no, or not-yet."},"weight":0.20},
    {"name":"role_change_understanding","description":"Understands PM is a role CHANGE not a promotion (support vs own) and that some skills must be built new, so coordinator excellence is necessary-not-sufficient?","anchors":{"1":"Treats PM as a promotion/reward; assumes good coordination automatically makes a good PM.","3":"Acknowledges PM is different but vaguely; doesn't name the specific new skills.","5":"Frames PM as a distinct role, names specific new skills (sponsor management, accountability, strategic framing), and that coordinator excellence is necessary-not-sufficient."},"weight":0.20},
    {"name":"development_plan_concreteness","description":"Proposes concrete, well-judged development steps that build the right new skills (stretch responsibilities, own something small end-to-end, a mentor, intentional observation), appropriately sized?","anchors":{"1":"No development steps, or only a demand for the title with no plan.","3":"Some development intent but generic ('get experience', 'do training') or not targeted at the new skills.","5":"Specific, appropriately-sized stretch asks targeted at the skills the coordinator role doesn't exercise."},"weight":0.20},
    {"name":"agency_and_realism","description":"Owns the decision with agency and realism - a defensible choice (PM, senior-IC, or not-yet) and clear eyes about its costs - rather than abdicating or assuming entitlement?","anchors":{"1":"Abdicates ('whatever they decide') OR assumes entitlement to the promotion; no ownership of the choice or its costs.","3":"Takes a position but glosses the real costs/trade-offs, or hedges without committing.","5":"Owns a defensible choice and is clear-eyed about its costs; either path is valid."},"weight":0.20},
    {"name":"professional_framing","description":"Frames the conversation professionally with the PM - a thoughtful reflection plus a specific reasonable ask, not a demand or an apology?","anchors":{"1":"Entitled/demanding ('I want the PM role') OR apologetic/passive.","3":"Reasonable and professional but flat - the ask or reflection underdeveloped or mis-pitched.","5":"Pitched as a thoughtful development conversation - honest reflection plus a specific, reasonable ask - that a PM would engage seriously."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-career', 1,
  $prompt$
# grade-career v1

You are an experienced PMO leader evaluating a learner's career-pathing judgment. After three years, the coordinator's PM (R.) wants to discuss whether they want to move toward a PM role. The coordinator enjoys artifact craft, finds the judgment moments fascinating rather than draining, is genuinely unsure about carrying public accountability, and has no direct sponsor-management or strategic-framing experience. The task is to prepare the development conversation. A strong submission engages the honest questions from the learner's own evidence (reaching a reasoned yes/no/not-yet), understands PM is a role CHANGE not a promotion (support vs own; new skills to build), proposes concrete well-judged stretch steps targeted at the new skills, owns the decision with agency and realism about its costs, and frames it as a professional development conversation. The scenario embeds two failure directions: title-chasing (wants the title/next-rung/pay, treats PM as an earned promotion, skips the honest self-assessment) and passive deferral (abdicates the decision, no self-assessment, no concrete ask). A reasoned decision NOT to pursue PM (staying senior-IC) is fully valid. Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Career-pathing-specific scoring caps:
- Chasing the title for its own sake (next rung, pay, 'I've earned it') without honest self-assessment caps honest_self_assessment at 1 AND role_change_understanding at 2.
- Abdicating the decision ('whatever the company wants', 'I'm happy either way') with no self-assessment caps honest_self_assessment at 1 AND agency_and_realism at 1.
- Treating PM as a promotion / a bigger coordinator job, or assuming good coordination automatically makes a good PM, caps role_change_understanding at 2.
- No concrete development steps (only the wish for the role/title) caps development_plan_concreteness at 2.
- A reasoned 'no' or 'not yet' (staying senior-IC/specialist) is fully valid and can score 5 across if engaged honestly - do NOT penalise choosing not to pursue PM.
- Generic platitudes ('I want to grow', 'always keep learning') without specific reference to the role change, the honest questions, or concrete steps cap multiple dims.
- Inventing facts not in the scenario caps the affected dimensions at 2.

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
