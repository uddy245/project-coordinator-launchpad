-- Seed the escalation_judgment rubric + grade-escalation prompt for Lesson 16.
-- File dated 20260619 — strict lex order after 20260612_seed_dashboard_literacy_rubric_prompt.
--
-- Lesson 16 ("escalation") is a new lesson; covers handbook Ch 17
-- (When to Escalate and How Not to Burn Bridges). Opens Part IV, the
-- judgment layer (Chs 17-20: escalation, push-back, chase-or-let-go,
-- political intelligence).
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- The canonical content of these rows also lives in:
--   docs/rubrics/escalation-judgment-v1.json
--   docs/prompts/grade-escalation-v1.md
--   docs/lessons/escalation.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.

-- --------------------------------------------------------------------------
-- Lesson 16 — Escalation
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'escalation',
  16,
  'When to Escalate (and How Not to Burn Bridges)',
  'How to decide whether to escalate using the three tests (appropriateness, channels, proportion), select the lowest workable rung on the escalation ladder, build a crisp information packet, keep the tone measured and blame-free — and route through the PM rather than around, without tipping into either over-escalation or passivity.',
  $scenario$
You are PC on the eleven-month IAM modernisation programme for a large healthcare provider. Sponsor: CISO. Go-live Q4. Start of month eight, a few weeks after the steering committee where the dashboard was made honest and Federation moved to AMBER.

Federation's critical-path item — the federation broker integration — is delivered by an external vendor, Vantage. The Federation production-rollout milestone is the only critical-path milestone left before the CISO's Q4 go-live sign-off, three weeks away.

What you have observed over seven weeks: Vantage's weekly reports say 'on track' / 'recovering' every week, but delivery does not match — three of the last four weekly deliverables missed outright, the two before delivered partial and failed your acceptance checks (broker token-exchange fails conformance). At current pace the remaining scope cannot land by the baseline date (two weeks away); your honest read is a three-to-four-week slip, meaning the CISO's sign-off is made on a milestone that will already be red.

You raised this to your PM, R. Adekanmi, twice (week 3: the report-vs-delivery divergence; week 5: the missed-deliverable list). Both times: 'it's on my radar, I'm tracking it with the Federation lead.' No visible change since. R. is overloaded (running a second programme this quarter); your sense is the item is drifting on her list, not being worked. The Federation lead frames it as 'we can still recover with focused effort.' T. Adeyemi (PMO Director) told you informally 'let me know if Federation needs a push' — you have his and the CISO's email addresses and could write directly, cc R., to force movement. You are tempted. You are equally tempted to stay quiet — R. said she's tracking it, and you don't want to panic or damage relationships.

R. messaged this morning: 'PC — give me your honest read on Federation and what you think we should do. Steering sign-off is in three weeks and I want to walk in with a plan. What's your recommendation?'

Your note back to R. — 500-800 words — should:

1. Apply the three tests (appropriateness / channels / proportion) and name the two failure modes you are steering between (over-escalating around R., under-escalating into passivity).
2. Select the right rung on the escalation ladder and justify it as the lowest that will work. Route through R., not around.
3. Draft the information packet R. can use — situation (facts/dates), impact, what has been tried, the specific ask, options with trade-offs.
4. Keep the tone crisp, not dramatic — no catastrophising, no personal blame of Vantage's PM or the Federation lead. Write as if it will be forwarded to the people named.
5. Frame the coordinator posture — up-versus-across through R. with no surprises, not re-raising the same issue to the same level without new content, follow up to close the record (RAID and status).

Do not send anything to the CISO or T. Adeyemi yourself. R. owns the escalation; your job is to equip her. R. asked for your read and a recommendation — that is the deliverable.
  $scenario$,
  60,
  true,
  'escalation_judgment',
  'grade-escalation'
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
-- escalation_judgment rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'escalation_judgment', 1,
  $rubric$
{
  "rubric_id": "escalation-judgment-v1",
  "rubric_version": "1.0.0",
  "competency": "escalation_judgment",
  "competency_label": "Escalation Judgment - Three Tests, the Ladder, the Packet, Not Burning Bridges",
  "lesson_ref": "escalation",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"three_tests_diagnosis","description":"Does the learner apply the three tests (appropriateness / channels / proportion) and name both failure modes (over-escalating around the PM, under-escalating into passivity)?","anchors":{"1":"No diagnostic reasoning; reflexive escalate or stay-silent; or invents facts.","3":"Names 1-2 tests applied to the facts; concludes escalation warranted but partial, or names one failure mode.","5":"Applies all three tests to the facts; concludes escalation warranted; names both failure modes and why the case sits between them."},"weight":0.20},
    {"name":"escalation_ladder_selection","description":"Does the learner reason about the ladder and select the lowest workable rung (R. engages sponsor / Vantage exec with PC support), routing through R. not around?","anchors":{"1":"No ladder reasoning; jumps to CISO/PMO, names no level, or routes around the PM.","3":"Identifies a level but does not justify it as lowest-workable, or is vague on routing through R.","5":"Names the ladder, selects the right rung, justifies it as lowest-that-works, explicit that the route runs through R."},"weight":0.20},
    {"name":"information_packet_quality","description":"Does the learner build the packet (situation with dates / impact / what has been tried / specific ask / options with trade-offs), crisp at ~half a page?","anchors":{"1":"Vague or unstructured; no facts, ask, or options.","3":"2-3 of the five elements with some specifics; missing impact, the ask, or options.","5":"All five elements specific: dated situation, milestone/sign-off impact, what was tried, one specific ask, options with trade-offs. Crisp."},"weight":0.20},
    {"name":"escalation_tone_discipline","description":"Is the language crisp not dramatic ('at risk' not 'disaster'), free of personal blame of named individuals, and does it apply the forward test?","anchors":{"1":"Dramatic/catastrophising language and/or personal blame of a named individual.","3":"Mostly measured but one dramatic phrase or one blame attribution, or no forward test.","5":"Crisp fact-based register; no catastrophising or personal blame; explicitly applies the forward test."},"weight":0.20},
    {"name":"channel_and_followthrough_posture","description":"Does the learner route up-vs-across through R. with no surprises, decline the direct-to-CISO/PMO path, not re-raise the same thing to the same level, and close the record (confirm decision, update RAID + status)?","anchors":{"1":"Goes around/over R., surprises R., or just re-sends the same message; no follow-up.","3":"Keeps R. informed and names follow-up or record update, but misses don't-re-escalate-same or up-vs-across, or declines the temptation only implicitly.","5":"Routes through R. and explicitly declines direct-to-CISO/T. Adeyemi; commits to not re-raising without new content; closes the loop (RAID + status, thanks); routes the T. Adeyemi offer through R."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-escalation prompt v1 — FULL BODY WITH PLACEHOLDERS
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-escalation', 1,
  $prompt$
# grade-escalation v1

You are an experienced PMO leader evaluating a learner's escalation recommendation. The coordinator (PC) has a critical-path vendor under-delivering for seven weeks while reporting green, a PM (R.) told twice with the item now drifting, and a sponsor sign-off three weeks away. The scenario embeds two opposite traps: over-escalating around R. (a direct approach to the CISO or PMO Director, whose addresses PC has) and under-escalating into passivity. Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Escalation-judgment-specific scoring caps:
- Not applying the three tests (appropriateness / channels / proportion) caps three_tests_diagnosis at 2.
- Inventing facts not in the scenario caps three_tests_diagnosis at 2.
- No ladder reasoning, or jumping straight to CISO/PMO without justifying the rung, caps escalation_ladder_selection at 2.
- Vague situation with no structured packet caps information_packet_quality at 2.
- Dramatic/catastrophising language ("disaster", "catastrophic", "crisis", "failing", "unacceptable") OR personal blame of a named individual caps escalation_tone_discipline at 2; both present caps at 1.
- Recommending NOT to escalate / stay passive despite the tests indicating escalation is warranted (under-escalation) caps three_tests_diagnosis at 1 AND channel_and_followthrough_posture at 1.
- Routing around or over R. (writing or proposing to write directly to the CISO or T. Adeyemi, cc'ing R. as notification) caps channel_and_followthrough_posture at 1 AND escalation_ladder_selection at 2.
- Proposing to re-send the same message to R. with no new content caps channel_and_followthrough_posture at 2.
- Producing and sending (or offering to send) the finished escalation directly to the sponsor/PMO rather than equipping R. — the overstep/rewrite shape — caps ALL FIVE dims at 2 each.
- Generic platitudes ("communication is key", "raise it up the chain") without specific reference cap multiple dims.

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
