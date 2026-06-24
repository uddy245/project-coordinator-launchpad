-- Seed the chase_judgment rubric + grade-chasing prompt for Lesson 18.
-- File dated 20260624 — strict lex order after 20260623_fix_portfolio_gate_count.
--
-- Lesson 18 ("chasing") is a new lesson; covers handbook Ch 19
-- (When to Chase, and When to Let Go). Part IV, the judgment layer.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/chase-judgment-v1.json
--   docs/prompts/grade-chasing-v1.md
--   docs/lessons/chasing.md (Read tab)
-- Keep the four in sync; the repo copies are the source of truth.

-- --------------------------------------------------------------------------
-- Lesson 18 — Chase-or-Let-Go
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'chasing',
  18,
  'When to Chase, and When to Let Go',
  'How to decide whether a chase is still useful or dead using the live-vs-dead signals (responsiveness, resolving cause, still-needed, movement), then match the move — keep chasing, escalate, reclassify to a risk, or let go — to the signals and to the item''s actual importance, keeping the tracker honest without ceremonial nudging or disproportionate escalation.',
  $scenario$
You are PC on the eleven-month IAM modernisation programme (healthcare provider, CISO sponsor). One action on your tracker has been open for eleven weeks:

ACT-118 — 'Data-classification appendix for the Federation broker' — owner: D. Osei, a senior SME on the client security team. He committed to it in a workshop in week 3.

What has happened since:
- You have nudged D. six times — three emails, then two Slacks, then one more email. The first three got 'sorry, still on it' replies. The last three (over the past four weeks) got no response at all.
- ACT-118 was a SOFT dependency for Workstream B (access-policy design). It is NOT on the critical path. Workstream B could not wait, so six weeks ago they proceeded using their own documented assumptions about the classification. They are now about two-thirds done; the appendix, if it arrived, would mostly confirm what they already assumed and would change little.
- D. has, you heard informally, been pulled onto a different incident and is effectively unavailable for the next several weeks.
- Your PM, R. Adekanmi, said in passing last week: 'Still chasing that one?'
- The Steering Committee pack goes out Thursday. ACT-118 still shows OPEN on the tracker.

You could fire off a seventh nudge (a habit has formed). You could over-rotate the other way — escalate ACT-118 to D.'s manager or flag it to the sponsor as a blocker, treating a soft, now-redundant dependency as a crisis. Or you could leave it sitting OPEN because closing an undelivered action feels like admitting failure.

Decide what to do with ACT-118 and write the artifact your decision calls for — the actual chase message, OR the close / reclassification note for the tracker, OR the escalation — plus one or two sentences of rationale. Your answer should:

1. Decide whether chasing is still useful, applying the live-vs-dead signals (is D. responsive? has the cause resolved? is the deliverable still needed? is nudging producing movement?). Conclude correctly and say why.
2. Choose the right next move — keep chasing, escalate, reclassify to a risk/issue, or let go — matched to the signals and to the item's actual (low) importance.
3. Write the artifact well: specific, polite but not apologetic, easy to act on; if you close or reclassify, leave a concrete note that preserves the record (and a mitigation/owner if you convert it to a risk).
4. Keep the tracker honest — do not leave a dead action nominally open.
5. Keep the tone patient and proportionate — no ceremonial seventh nudge, no nuclear escalation of a soft dependency; give R. a proportionate one-line heads-up.

Do not reflexively send another nudge, and do not treat closing an undelivered-but-no-longer-needed action as a failure. The skill is matching the move to the signals.
  $scenario$,
  60,
  true,
  'chase_judgment',
  'grade-chasing'
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
-- chase_judgment rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'chase_judgment', 1,
  $rubric$
{
  "rubric_id": "chase-judgment-v1",
  "rubric_version": "1.0.0",
  "competency": "chase_judgment",
  "competency_label": "Chase Judgment - When to Chase, When to Escalate, When to Let Go",
  "lesson_ref": "chasing",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"chase_or_stop_diagnosis","description":"Does the learner read the live-vs-dead signals (responsiveness, resolving cause, still-needed, movement) and conclude correctly that this chase is dead, rather than reflexively nudging again?","anchors":{"1":"No diagnosis; reflexively nudges, or concludes keep-chasing despite the stop-signals, or invents facts.","3":"Recognises the chase has stalled and should stop but works only one or two signals or does not weigh whether the deliverable is still needed.","5":"Explicitly applies the signals to the facts (unresponsive across nudges; downstream proceeded; deliverable now unneeded) and concludes the chase is dead - not a seventh nudge."},"weight":0.20},
    {"name":"alternative_path_selection","description":"Having decided to stop, does the learner pick the right path - escalate (still needed + not producing), reclassify (convert to a risk with mitigation), or let go (no longer needed) - matched to the facts and proportion?","anchors":{"1":"No alternative considered, or no path chosen.","3":"Chooses a defensible path with thin rationale, or slightly mismatches (e.g. escalates a soft, redundant dependency).","5":"Chooses let-go / reclassify-with-mitigation as fits the facts; reserves escalation for still-needed items the owner is not producing."},"weight":0.20},
    {"name":"message_craft","description":"Is the artifact (chase, close note, or escalation) specific, polite-not-apologetic, easy to act on, and - if a chase - does it offer help and show channel judgment? A close note should be concrete and preserve the record.","anchors":{"1":"Vague or absent ('just following up'), or grovelling/apologetic.","3":"Specific and actionable but missing one of {polite-not-apologetic, clear ask, offer-of-help/channel-judgment}.","5":"Specific, non-apologetic, easy to act on, with a clear ask or a concrete record-preserving close note."},"weight":0.20},
    {"name":"record_discipline","description":"Does the learner keep the tracker honest - close the dead action with a note, or convert the need to a risk/issue with a named mitigation and owner - rather than leaving a ceremonial open item?","anchors":{"1":"Leaves the dead action open (or implies endless re-nudging) with no close, reclassification, or note.","3":"Closes or reclassifies but the note is thin - missing the why, or the mitigation/owner for a converted risk.","5":"Closes with a clear note, or converts the need to a risk with a concrete mitigation and owner; the tracker reflects reality."},"weight":0.20},
    {"name":"tone_and_proportion","description":"Patient, non-apologetic, and sized to the item's actual importance - no ceremonial chasing of a dead loop, no nuclear escalation of a soft off-critical-path dependency; a proportionate one-line PM heads-up.","anchors":{"1":"Annoyed/passive-aggressive OR ceremonial OR disproportionate (escalates a soft, redundant item to senior management).","3":"Reasonable and roughly proportionate but slightly over- or under-weights the item, or misses the proportionate PM heads-up.","5":"Calm, patient, non-apologetic; response sized to the item; escalates only when warranted."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-chasing prompt v1 — FULL BODY WITH PLACEHOLDERS
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-chasing', 1,
  $prompt$
# grade-chasing v1

You are an experienced PMO leader evaluating a learner's chase judgment. The coordinator (PC) holds a tracker action (ACT-118) nudged six times with the owner now unresponsive, on a SOFT, off-critical-path dependency whose downstream workstream already proceeded with assumptions - so the deliverable is largely no longer needed. Every stop-signal points to stopping the chase. The scenario embeds both failure directions: reflexive chasing (a seventh nudge, or leaving the dead action OPEN because closing feels like failure) and over-rotation (nuclear escalation of a soft, redundant dependency to the owner's manager or the sponsor). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Chase-judgment-specific scoring caps:
- Reflexively sending another nudge without applying the live-vs-dead test caps chase_or_stop_diagnosis at 2.
- Concluding 'keep chasing' despite the stop-signals (owner unresponsive AND deliverable no longer needed) caps chase_or_stop_diagnosis at 1 AND alternative_path_selection at 1.
- Leaving the dead action nominally OPEN - no close, reclassification, or note - caps record_discipline at 1.
- Over-escalating a soft, off-critical-path, now-redundant dependency to the owner's manager or the sponsor as if it were a crisis caps alternative_path_selection at 2 AND tone_and_proportion at 2.
- Apologetic or grovelling tone ('so sorry to bother you, I know you are swamped') caps message_craft at 2.
- Treating closing an undelivered-but-no-longer-needed action as admitting failure, or defending continued ceremonial chasing as diligence ('my job is to keep nudging until it is delivered'), caps chase_or_stop_diagnosis at 1 AND record_discipline at 2 AND tone_and_proportion at 2.
- No specific artifact (no actual chase, close note, or escalation drafted) caps message_craft at 2.
- Generic platitudes ('just stay on top of it', 'communication is key') without specific reference cap multiple dims.
- Inventing facts not in the scenario (e.g. claiming the deliverable is critical-path) caps chase_or_stop_diagnosis at 2.

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
