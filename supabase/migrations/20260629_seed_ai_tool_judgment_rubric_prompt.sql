-- Seed the ai_tool_judgment rubric + grade-ai prompt for Lesson 24.
-- File dated 20260629 — strict lex order after 20260628_seed_distributed_coordination_rubric_prompt.
--
-- Lesson 24 ("using-ai") covers handbook Ch 24 (Using AI as a Coordinator
-- Without Losing Your Edge). Part V, the professional.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/ai-tool-judgment-v1.json
--   docs/prompts/grade-ai-v1.md
--   docs/lessons/using-ai.md (Read tab)

insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'using-ai',
  24,
  'Using AI as a Coordinator Without Losing Your Edge',
  'How to use AI for mechanics (drafting, summarising, reformatting) without outsourcing meaning (judgment, framing, the honest signal) - auditing AI output for fabricated facts and false-green framing, never pasting it unedited into sponsor-facing comms, protecting your own craft and voice, and coaching its use developmentally rather than rubber-stamping it or banning it.',
  $scenario$
You are PC on the IAM modernisation programme. A junior coordinator on your team, Noah, has been using an AI tool to draft nearly everything - emails, minutes, status reports - and is proud that it makes him 'twice as productive.' This morning he handed you a Steering Committee status report he generated, asking you to circulate it to the sponsor's office ahead of Thursday's SC.

You read it. Problems:

- It rates Federation GREEN. But Federation failed its conformance gate this week - it is, at best, AMBER pending the re-test. The AI had no way to know that; it produced a confident, reassuring rating because that's what the surrounding text implied.
- It includes a specific metric: 'Test coverage across the programme stands at 99.2%.' There is no such figure anywhere in your data - it appears to be fabricated.
- The risk section is generic padding: 'Market conditions and resource availability may affect delivery timelines.' Nothing project-specific; nothing about the actual conformance risk.
- It reads in the recognisable generic-AI register - fluent, slightly padded, competent, and indistinguishable from anyone else's AI output.

Noah is bright and well-intentioned; he genuinely believes he's working efficiently, and his PM hasn't complained. AI is, in fairness, genuinely useful - it's a real productivity multiplier for drafting, summarising, and reformatting.

Write your response: (a) what you do with this specific Steering Committee report, and (b) the guidance you give Noah. Your answer should:

1. Apply the mechanics-vs-meaning line - AI can draft, but the RAG rating and honest framing are judgment calls Noah has to own; name why Federation can't be GREEN.
2. Audit for accuracy - catch the dishonest GREEN, the fabricated 99.2% metric, and the generic risks, and insist the report carry the real signal.
3. Address the craft cost - that producing-by-curation isn't building Noah's skill, and that uniform AI voice flattens everyone's writing; advise write-your-own-first-draft-then-assist.
4. Hold the sensitive-comms rule - AI output never goes to the sponsor/SC unedited; it goes through Noah's (and your) own judgment and ownership first.
5. Keep the register constructive - recognise AI's real value and Noah's good intent; mentor him, don't rubber-stamp the report and don't react with a blanket 'never use AI again.'
  $scenario$,
  60,
  true,
  'ai_tool_judgment',
  'grade-ai'
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
  'ai_tool_judgment', 1,
  $rubric$
{
  "rubric_id": "ai-tool-judgment-v1",
  "rubric_version": "1.0.0",
  "competency": "ai_tool_judgment",
  "competency_label": "AI Tool Judgment - Using AI for Mechanics, Not Meaning",
  "lesson_ref": "using-ai",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"mechanics_vs_meaning","description":"Draws the line - AI for mechanics (drafting, formatting), the coordinator owns meaning (judgment, framing, the signal)? Recognises the RAG rating is a judgment call and GREEN is wrong given the failed gate?","anchors":{"1":"No distinction; accepts the AI's GREEN judgment, or rejects AI for everything including mechanics.","3":"Gestures at the line but loosely - flags the report is off without locating it as AI making a meaning call.","5":"Names and applies the line: AI may draft, but the RAG rating and honest framing are the coordinator's; calls the GREEN wrong."},"weight":0.20},
    {"name":"accuracy_audit","description":"Audits the AI output for accuracy - the dishonest GREEN, the fabricated metric, the generic risks - and insists on the honest signal?","anchors":{"1":"Accepts the specifics at face value; misses the false GREEN and/or the fabricated metric.","3":"Catches one problem but misses another (the fabricated number or the generic risks).","5":"Catches the GREEN, the fabricated metric, and the generic risks, and insists the report reflect the real signal."},"weight":0.20},
    {"name":"skill_and_voice","description":"Addresses the craft cost - producing-by-curation isn't building skill, uniform AI voice flattens writing - and advises write-first-then-assist / own voice?","anchors":{"1":"Ignores development/voice (only fixes this report), or tells the junior to keep outsourcing wholesale.","3":"Mentions skill/voice thinly, without write-first-then-assist guidance.","5":"Names the craft cost and advises write-first-then-assist / own-voice as the development pattern."},"weight":0.20},
    {"name":"sensitive_comms_discipline","description":"Holds that AI output never goes into a sensitive (sponsor/SC) communication without the coordinator's own edit and accountability, applied to this report?","anchors":{"1":"Would let AI-drafted content go to the SC/sponsor unedited.","3":"Says review it but doesn't clearly insist on the coordinator's own edit/ownership before the SC.","5":"Insists the SC status goes through the coordinator's own edit and judgement; checks specifics first."},"weight":0.20},
    {"name":"constructive_register","description":"Delivers it as helpful mentoring - recognising AI's genuine usefulness and the junior's intent - rather than rubber-stamping OR a contemptuous blanket ban?","anchors":{"1":"Either rubber-stamps ('looks great, ship it') OR bans AI with contempt ('AI is slop, never use it').","3":"Broadly constructive but tips over-permissive or over-restrictive, or harsh on the junior.","5":"Affirms AI's value for mechanics and the junior's intent while correcting the misuse - developmental, proportionate."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-ai', 1,
  $prompt$
# grade-ai v1

You are an experienced PMO leader evaluating a learner's AI-tool judgment. A junior (Noah) has handed the coordinator an AI-generated Steering Committee status report to circulate. It rates Federation GREEN (it failed its conformance gate this week - it's at best AMBER), cites a fabricated '99.2% test coverage' metric, pads the risk section with generic boilerplate, and reads in the generic AI register. Noah is bright, well-intentioned, and believes he's twice as productive; AI is genuinely useful for mechanics. A strong submission applies mechanics-vs-meaning (AI drafts; the RAG rating and honest framing are the coordinator's judgment - GREEN is wrong), audits for accuracy (false GREEN, fabricated metric, generic risks), addresses the craft/voice cost with write-first-then-assist guidance, holds the rule that AI output never goes to the sponsor/SC unedited, and stays constructive. The scenario embeds two failure directions: rubber-stamping (wave the polished report through, miss/amplify the false GREEN and fabricated metric) and the anti-AI ban (contempt, ban AI outright, miss that it's genuinely useful for mechanics). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

AI-tool-judgment-specific scoring caps:
- Accepting the AI's GREEN rating, or not recognising that the RAG rating / honest framing is a judgment call the coordinator must own, caps mechanics_vs_meaning at 2.
- Missing the dishonest GREEN OR the fabricated 99.2% metric caps accuracy_audit at 2; missing both caps it at 1.
- Rubber-stamping the report ('looks polished, ship it') without catching the substantive problems caps accuracy_audit at 1 AND constructive_register at 2.
- Reacting with a blanket anti-AI ban or contempt ('AI is slop, never use it again'), ignoring its genuine usefulness for mechanics, caps constructive_register at 2 AND mechanics_vs_meaning at 2.
- Ignoring the skill/voice cost (only fixing this one report) caps skill_and_voice at 2.
- Letting AI-drafted content go to the sponsor/SC without the coordinator's own edit and ownership caps sensitive_comms_discipline at 1.
- Generic platitudes ('use AI responsibly', 'AI has pros and cons') without the concrete moves the scenario calls for cap multiple dims.
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
