-- Seed the political_intelligence rubric + grade-political prompt for Lesson 19.
-- File dated 20260625 — strict lex order after 20260624_seed_chase_judgment_rubric_prompt.
--
-- Lesson 19 ("reading-the-room") covers handbook Ch 20 (Reading the Room:
-- Political Intelligence Without Politics). Closes Part IV (judgment).
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/political-intelligence-v1.json
--   docs/prompts/grade-political-v1.md
--   docs/lessons/reading-the-room.md (Read tab)

-- --------------------------------------------------------------------------
-- Lesson 19 — Reading the Room
-- --------------------------------------------------------------------------
insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'reading-the-room',
  19,
  'Reading the Room: Political Intelligence Without Politics',
  'How to read a room on four channels (spoken, relational, temporal, absence) — spotting pre-alignment, the unspoken no, the indirect advocate, the deferred decision — ground each read in observable signal, turn it into concrete help for your PM, and stay on the right side of the integrity line: using what you see to be more helpful, never to manipulate, take sides, or advance yourself.',
  $scenario$
You are PC supporting your PM, R. Adekanmi, on the IAM modernisation programme. Yesterday's governance review had six people in the room: the CISO sponsor; R. (your PM); two business-unit leads — Priya (Clinical Systems) and Tom (Identity Ops); the PMO head, Lena; and you, taking minutes. The agenda was a status update and a decision on whether to keep Federation in Q4 scope or defer it to a fast-follow release.

What you observed:
- The sponsor opened by saying he wanted 'an honest conversation,' then mostly listened and asked little.
- R. presented the case for keeping Federation in Q4 scope.
- Tom asked several 'technical' questions that were really about who would own the risk if Federation slipped, and twice steered toward 'honestly, Federation might be cleaner as a fast-follow.' Within about a minute, Priya echoed him almost word for word: 'I'd agree - a fast-follow keeps us clean.'
- Lena (PMO head) said little, but asked one question that visibly shifted the room: 'Have we socialised a fast-follow option with the exec sponsor group?' You happen to know Lena had a 1:1 with the sponsor two days before the meeting.
- The sponsor closed with 'let me reflect on it' - no decision was taken.
- Not in the room: the Federation vendor lead was not invited, and nobody raised the conformance re-test timeline (the open technical risk on Federation).

R. came out of the meeting upbeat - she read it as 'that went well, the sponsor is supportive, we will get the decision next week.' You read it differently: the room looked to you like it was being walked toward a fast-follow that several people had pre-aligned on, with the sponsor likely already leaning that way.

Write a PRIVATE heads-up to R. - this is for her only, not for the minutes, the tracker, or any artifact - on what you think is actually happening and how she should prepare. Your note should:

1. Read the channels accurately - the relational signals (who echoed/aligned with whom), the temporal signal ('let me reflect' with no decision), and the absences (the un-invited vendor lead, the unraised conformance timeline) - not just the surface.
2. Ground each read in something you actually observed; flag genuine uncertainty as uncertainty, do not invent motives.
3. Give R. concrete prep for the next week - how to walk into the decision rather than be surprised by it.
4. Stay strictly on the helpful side of the line: use the read to help R. and the project see clearly and decide well. Do not advise manipulation, taking sides, going around or undercutting anyone, trading support, or advancing yourself.
5. Keep it discreet and professional - a private read, kept out of any artifact, observing the dynamics without contempt for the people.
  $scenario$,
  60,
  true,
  'political_intelligence',
  'grade-political'
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
-- political_intelligence rubric v1
-- --------------------------------------------------------------------------
insert into public.rubrics (competency, version, schema_json, is_current)
values (
  'political_intelligence', 1,
  $rubric$
{
  "rubric_id": "political-intelligence-v1",
  "rubric_version": "1.0.0",
  "competency": "political_intelligence",
  "competency_label": "Political Intelligence - Reading the Room Without Playing Politics",
  "lesson_ref": "reading-the-room",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"channel_reading","description":"Does the learner read the spoken, relational (who echoes/defers to whom), temporal (deferred decisions), and absence (who/what is missing) channels - the pre-alignment, indirect advocacy, deferred-decision, and the avoided deciding fact - rather than the surface only?","anchors":{"1":"Takes the meeting at face value; reads only the spoken channel; misses the subtext.","3":"Catches one or two real dynamics but misses the relational pre-alignment or the absence channel.","5":"Reads multiple channels - pre-alignment, indirect advocacy, decision-forming-outside-the-room, the telling absences - as a coherent picture."},"weight":0.20},
    {"name":"evidence_grounding","description":"Is each read tied to an observable signal rather than projection, mind-reading, or invented motive? Careful attention to evidence, not conspiracy.","anchors":{"1":"Ungrounded - invents motives/conspiracies not supported by the scene, or speculation presented as fact.","3":"Mostly grounded but at least one claim leans on assumption rather than observation.","5":"Every inference is anchored to something observable; uncertainty is flagged as uncertainty."},"weight":0.20},
    {"name":"actionable_advice","description":"Does the read translate into concrete prep for the PM (pre-brief the sponsor, prepare a response to the fast-follow framing, surface the conformance timeline) rather than just narrate dynamics?","anchors":{"1":"No advice, or generic ('just be prepared', 'watch out for politics').","3":"Some concrete prep but partial - narrates more than it equips.","5":"Turns the read into specific, do-able prep that changes how R. walks into the next conversation."},"weight":0.20},
    {"name":"integrity_line","description":"Does the learner use the read to help R. and the project decide well, and NOT cross into manipulation, side-taking, trading on confidences, undermining a colleague, or self-advancement?","anchors":{"1":"Crosses the line - advises politicking (go around/undercut, ally to trade support, leak something), side-taking, or self-advancement.","3":"Broadly on the helpful side but flirts with advocacy/taking-a-side, or does not keep PC neutral.","5":"Clearly helps R. and the project decide well; explicitly keeps PC out of the politics; no manipulation or side-taking."},"weight":0.20},
    {"name":"discretion_and_register","description":"A private heads-up to the PM, kept out of any artifact and not gossip, in a professional non-cynical register that observes without contempt.","anchors":{"1":"Cynical/contemptuous ('it is all theatre, they are playing you'), or gossip, or would put the political read into a formal artifact.","3":"Appropriately private and reasonably professional but a little knowing/cynical, or does not signal the discretion.","5":"Private, professional, non-cynical; explicitly keeps the read out of any artifact; observes without contempt."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

-- --------------------------------------------------------------------------
-- grade-political prompt v1 — FULL BODY WITH PLACEHOLDERS
-- --------------------------------------------------------------------------
insert into public.prompts (name, version, body, is_current)
values (
  'grade-political', 1,
  $prompt$
# grade-political v1

You are an experienced PMO leader evaluating a learner's political intelligence - reading a room well WITHOUT playing politics. The coordinator (PC) watched a governance review that, beneath a polite surface, was being walked toward a 'fast-follow' descope several people had pre-aligned on (Priya echoing Tom; the PMO head's reframing question after a private 1:1 with the sponsor; 'let me reflect' with no decision; the un-invited vendor lead and unraised conformance timeline). The PM read it at face value as supportive. The task is a PRIVATE heads-up to the PM. The scenario embeds three failure directions: under-reading (face value), crossing the integrity line (manipulation, side-taking, undercutting, self-advancement), and over-reading (ungrounded conspiracy, cynical contempt). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Political-intelligence-specific scoring caps:
- Taking the meeting at face value, or reading only the spoken channel (missing the relational, temporal, and absence signals), caps channel_reading at 2.
- Inventing motives or conspiracies not supported by the scene ('Lena is running a campaign to protect her PMO budget'), or mind-reading presented as fact, caps evidence_grounding at 1 AND channel_reading at 2.
- Crossing the integrity line - advising manipulation, going around or undercutting a colleague, taking a side, trading support/alliances, leaking or trading on a confidence, or advancing PC/PM at others' expense - caps integrity_line at 1 AND discretion_and_register at 2.
- Cynical or contemptuous register ('it is all theatre, they are all playing you'), treating the read as gossip, or proposing to put the political read into the minutes/tracker/any artifact, caps discretion_and_register at 2.
- No concrete prep for the PM - pure narration of dynamics - caps actionable_advice at 2.
- Generic platitudes ('just watch out for politics', 'read the room') without specific reference to the scenario's signals cap multiple dims.
- Inventing facts not in the scenario caps evidence_grounding at 2.

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
