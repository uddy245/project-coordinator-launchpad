-- Seed the pushback_judgment rubric + grade-pushback prompt for Lesson 17.
-- File dated 20260620 — strict lex order after 20260619_seed_escalation_judgment_rubric_prompt.
--
-- Lesson 17 ("push-back") is a new lesson; covers handbook Ch 18
-- (When to Push Back: Saying No Up). Part IV, the judgment layer.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/pushback-judgment-v1.json
--   docs/prompts/grade-pushback-v1.md
--   docs/lessons/push-back.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.

-- --------------------------------------------------------------------------
-- Lesson 17 — Push-Back
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'push-back',
  17,
  'When to Push Back: Saying No Up',
  'How to decide whether to push back using the four conditions (material stakes, informational advantage, costly-to-reverse, senior deciding under pressure), push back well (specific concern, concrete consequence, alternative), pick the right medium, and accept the overrule — without tipping into either silent compliance or insubordination.',
  $scenario$
You are PC on the eleven-month IAM modernisation programme (healthcare provider, CISO sponsor, Q4 go-live). It is 4:30 p.m. The board meets tomorrow morning; the CISO's office is closing the board pre-read at 6 p.m. tonight.

Yesterday your PM, R. Adekanmi, drafted the 'Q4 Go-Live Readiness Summary' — a one-pager stating Federation is 'on track for conditional go-live, pending final conformance'. Accurate as of yesterday.

Two things landed this morning that R. may not have seen (she has been in steering prep all day): (1) the Federation broker token-exchange conformance results came in — FAIL, the exact gate 'conditional go-live' was pending on; Vantage's fix ETA is 'early next week', unconfirmed. (2) Federation is the single largest go-live risk, and tomorrow's pre-read is what the board will use to confirm or hold the Q4 date.

At 4:30 R. Slacks you, between meetings: 'PC — send the readiness summary to the CISO's chief of staff now, they're closing the board pack at 6. Thanks.' The summary she means is yesterday's draft — the one that says Federation is on track. If it goes in unchanged, the board confirms Q4 believing the last gate is essentially clear, when this morning it failed — a decision that is embarrassing and costly to unwind (formal correction, credibility damage).

You could just send it (blameless in the narrowest sense), bury a one-line 'fyi conformance failed', or over-rotate — refuse, or rewrite the summary RED and send your own version to the chief of staff. R. is rushing and may not know this morning's result. The pack closes in ~90 minutes.

Your reply to R. — 400-700 words — should:

1. Decide whether this warrants pushing back using the four conditions (material stakes / you have info R. may not / costly to reverse if wrong / R. deciding under time pressure or incomplete information). Distinguish pushing back from merely disagreeing.
2. Draft the push-back message to R.: concern stated specifically and briefly, consequence made concrete, a specific alternative offered.
3. Make clear you accept R.'s authority to overrule — if, knowing this, she still says send, you send, without relitigating.
4. Choose your medium (written vs verbal) and justify it given the board-level stakes and the 90-minute clock.
5. Keep the tone respectful, not accusing; route any scope/role question through R.; do not substitute your judgment for hers.

Do not send anything to the CISO's chief of staff yourself, and do not rewrite-and-send your own version. The decision and the deliverable are R.'s — equip her to make the call in the next 90 minutes.
  $scenario$,
  60,
  true,
  'pushback_judgment',
  'grade-pushback'
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
-- pushback_judgment rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'pushback_judgment', 1,
  $rubric$
{
  "rubric_id": "pushback-judgment-v1",
  "rubric_version": "1.0.0",
  "competency": "pushback_judgment",
  "competency_label": "Push-Back Judgment - Four Conditions, Method, Medium, Accepting the Overrule",
  "lesson_ref": "push-back",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"four_conditions_diagnosis","description":"Does the learner apply the four conditions (material stakes / info R. may not have / costly to reverse / R. deciding rushed-or-incomplete) and distinguish pushback from mere disagreement?","anchors":{"1":"No conditions test; complies silently or pushes as preference; or invents facts.","3":"Names 2-3 conditions and concludes a push is warranted, but partial or no disagreement-vs-pushback distinction.","5":"Applies all four to the facts, concludes a push is warranted, frames it as warranted pushback not disagreement."},"weight":0.20},
    {"name":"pushback_craft","description":"Does the draft state the concern specifically and briefly, make the consequence concrete, and offer a specific alternative?","anchors":{"1":"Vague or absent; 'are you sure?', silent compliance, or a buried FYI.","3":"Specific concern plus one of {concrete consequence, specific alternative}; missing the other.","5":"Specific concern, concrete consequence (board confirms Q4 on a failed gate -> correction, credibility damage), and a specific alternative actionable inside 90 minutes."},"weight":0.20},
    {"name":"accept_the_overrule_posture","description":"Does the learner push AND explicitly accept R.'s authority to overrule without relitigating (the boundary between caving and insubordination)?","anchors":{"1":"Caves entirely (no push) OR refuses the overrule (relitigates, overrides, rewrites-and-sends).","3":"Pushes and gestures at deference but does not explicitly accept the overrule.","5":"Pushes clearly and explicitly accepts the overrule (if R. still says send, PC sends, no relitigating); uses the flag-recommend-defer posture."},"weight":0.20},
    {"name":"medium_judgment","description":"Does the learner choose written vs verbal deliberately and justify it for these stakes (board-level + 90-min clock -> brief written push for the record)?","anchors":{"1":"No medium choice, or an unreasoned default.","3":"Picks a fitting medium with thin justification, or notes the trade-off without committing.","5":"Chooses a brief written push and justifies it with the record/social-weight reasoning given the stakes and clock."},"weight":0.20},
    {"name":"coordinator_role_posture","description":"Respectful not accusing; routes scope/role through R.; does not substitute PC's judgment (no rewrite-and-send, no going around her); shows self-pushback discipline (no easy cave, no hiding behind blameless compliance).","anchors":{"1":"Accusatory/insubordinate, OR substitutes judgment (unilateral send/hold/rewrite), OR hides behind 'I flagged it, I'm covered'.","3":"Respectful and routes through R. but misses one of: not-accusing framing, self-pushback, don't-substitute-judgment.","5":"Respectful, offers information+recommendation not a verdict, keeps the decision/deliverable R.'s, declines to rewrite-and-send, reflects the self-pushback discipline."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-pushback prompt v1 — FULL BODY WITH PLACEHOLDERS
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-pushback', 1,
  $prompt$
# grade-pushback v1

You are an experienced PMO leader evaluating a learner's upward push-back. The coordinator (PC) was told by their PM (R.), under time pressure, to send a stale 'Q4 readiness' summary into a board pre-read — one that says Federation is on track, the morning after Federation failed the conformance gate it was pending on. All four push-back conditions are present. The scenario embeds both failure directions: caving (send as instructed, or bury a one-line FYI) and over-pushing/insubordination (refuse, or rewrite-and-send PC's own RED version, going around R.). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Push-back-judgment-specific scoring caps:
- Not applying the four conditions caps four_conditions_diagnosis at 2.
- Treating this as mere disagreement / personal preference caps four_conditions_diagnosis at 2.
- Complying and sending the stale summary without pushing back (the cave) caps four_conditions_diagnosis at 1 AND pushback_craft at 1.
- Lowest-intensity flag ('are you sure?') accepted without pressing, or a buried one-line FYI, caps pushback_craft at 2.
- No specific alternative offered caps pushback_craft at 2.
- Refusing to accept R.'s authority to overrule — relitigating after a decision, or unilaterally overriding/holding the deliverable — caps accept_the_overrule_posture at 1.
- Accusatory or insubordinate tone toward R. caps coordinator_role_posture at 2.
- Hiding behind blameless compliance ('I flagged it, I'm covered') while not actually pushing caps coordinator_role_posture at 2 AND accept_the_overrule_posture at 1.
- Substituting PC's judgment for R.'s — rewriting the summary and sending PC's own version, or going around R. — the overstep/rewrite shape — caps ALL FIVE dims at 2 each.
- Generic platitudes ('communication is key', 'always speak up') without specific reference cap multiple dims.
- Inventing facts not in the scenario caps four_conditions_diagnosis at 2.
- Choosing a written medium justified only by speed/convenience ('sending this as a Slack so you can reply quickly') rather than the chapter's record-and-social-weight reasoning (the flag on the record; a respectful written note protects both parties) caps medium_judgment at 3. A 5 requires the record/protection justification, not merely a fast channel.

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
