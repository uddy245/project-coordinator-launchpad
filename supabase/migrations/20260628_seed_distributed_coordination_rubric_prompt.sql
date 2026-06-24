-- Seed the distributed_coordination rubric + grade-remote prompt for Lesson 23.
-- File dated 20260628 — strict lex order after 20260627_seed_vendor_partnership_rubric_prompt.
--
-- Lesson 23 ("remote-hybrid") covers handbook Ch 23 (Remote, Hybrid, and
-- Cross-Time-Zone Realities). Part V, the professional.
--
-- IMPORTANT: prompts.body includes the FULL template with
-- {{rubric_json}} / {{scenario_text}} / {{submission_text}} placeholders.
-- See 2026-06-10 incident — DO NOT trim the user-prompt-template block.
--
-- Canonical copies also live in:
--   docs/rubrics/distributed-coordination-v1.json
--   docs/prompts/grade-remote-v1.md
--   docs/lessons/remote-hybrid.md (Read tab)

insert into public.lessons (
  slug, number, title, summary, scenario_text,
  estimated_minutes, is_published, competency, prompt_name
)
values (
  'remote-hybrid',
  23,
  'Remote, Hybrid, and Cross-Time-Zone Realities',
  'How remote and cross-time-zone work changes coordination - replacing ambient awareness with deliberate checking, making written communication load-bearing, collapsing the 24-hour decision loop with fully-contexted async messages, choosing async over reflexive meetings, rotating the unsocial-hours burden fairly, and keeping the human layer a shared office would provide automatically.',
  $scenario$
You are PC on the IAM modernisation programme, now running with a distributed team: you and your PM R. in London (GMT); the Federation integration squad in Bangalore (IST, +5.5h); and the security architects in Toronto (EST, -5h). Four things are on your plate this week:

1. THE STALLED DECISION. The Bangalore squad needs a ruling on whether to use token-binding approach A or B before they can proceed. The question has bounced for three days: someone asks a one-line question at the end of their day, and the answer comes ~24 hours later, so nothing resolves. You actually have enough to make a recommendation: A is simpler and meets the conformance requirement; B is more future-proof but adds two weeks. R. can make the call but needs it teed up.

2. THE UNWRITTEN DECISION. Last week, on a call, the team verbally agreed 'we'll go with the existing IdP for phase 1.' It was never written down. You've since realised Bangalore and Toronto have different understandings of what that included - Toronto thinks it covers MFA, Bangalore thinks MFA is phase 2.

3. THE MEETING BURDEN. The weekly sync has run at 7:00am London / 12:30pm Bangalore / 2:00am Toronto for two months. Toronto always takes the 2am hit. Nobody has raised it, but you've noticed the Toronto architects are increasingly quiet in those calls.

4. THE QUIET TEAMMATE. Arjun, a strong developer in Bangalore, has gone noticeably quiet over the last two weeks - terse one-line messages, and he missed Monday's stand-up without a word. It's unlike him.

Write the coordination moves you'd make this week. Your answer should:

1. Collapse the A-vs-B decision loop with a single, fully-contexted asynchronous message - context, the two options, your recommendation, and a clear by-when and reply format - rather than scheduling another hard-to-align call or firing one more one-line question.
2. Write down the verbal IdP decision and circulate it to reconcile the differing MFA understandings.
3. Choose async vs meeting deliberately - don't default to 'let's all hop on a call.'
4. Fix the time-zone fairness - rotate the 2am burden off Toronto (or propose a fair pattern) and acknowledge it.
5. Make a light-touch human check on Arjun - the remote equivalent of stopping by his desk - not an output/performance interrogation.
  $scenario$,
  60,
  true,
  'distributed_coordination',
  'grade-remote'
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
  'distributed_coordination', 1,
  $rubric$
{
  "rubric_id": "distributed-coordination-v1",
  "rubric_version": "1.0.0",
  "competency": "distributed_coordination",
  "competency_label": "Distributed Coordination - Remote, Hybrid, and Cross-Time-Zone Discipline",
  "lesson_ref": "remote-hybrid",
  "pass_threshold": 3,
  "hire_ready_threshold": 4,
  "dimensions": [
    {"name":"async_with_context","description":"Collapses the stalled decision loop with a single fully-contexted async message (context + options + recommendation + by-when + reply format), rather than a context-light one-liner or a reflexive call?","anchors":{"1":"Defaults to a call for the decision, or sends another bare one-line question that won't collapse the 24h loop.","3":"Moves it async but thin - missing the recommendation, the by-when, or a clear reply format.","5":"One async message with full context + options + recommendation + by-when + reply format, designed to resolve in a single round-trip."},"weight":0.20},
    {"name":"written_memory","description":"Writes down and circulates the verbally-agreed decision to create shared memory and reconcile the conflicting understandings?","anchors":{"1":"Leaves the verbal decision unwritten, or adds no written confirmation of consequential agreements.","3":"Writes something but doesn't circulate it or doesn't resolve the conflicting understandings.","5":"Writes the decision clearly and circulates it to both sites to reconcile the differing understandings."},"weight":0.20},
    {"name":"meeting_judgment","description":"Chooses async vs meeting deliberately - reserving/structuring real-time only where needed - rather than reflexively scheduling calls?","anchors":{"1":"Reflexively schedules meetings for things that could be async; no structure.","3":"Right instinct but applied loosely, or a meeting without distributed-attention structure.","5":"Deliberately routes the decision and recap to async; reserves/structures any meeting that genuinely needs real-time."},"weight":0.20},
    {"name":"timezone_fairness","description":"Notices and fixes the burden that has fallen on one zone - rotate it or propose a fair pattern, and acknowledge it - rather than ignoring or dumping it?","anchors":{"1":"Ignores the rotation problem, or actively keeps/dumps the unsocial hour on one zone ('they'll cope').","3":"Notices the issue but the fix is vague or only half-addresses it.","5":"Rotates the unsocial slot (or proposes a concrete fair pattern) and acknowledges who's been carrying the accommodation."},"weight":0.20},
    {"name":"human_layer","description":"Makes the light-touch human check on the quiet teammate that a shared office would produce automatically - human-first, not output-first or heavy-handed?","anchors":{"1":"Ignores the quiet teammate, or treats it only as a performance/output problem.","3":"Notes the teammate but perfunctorily or framed around their deliverables.","5":"A genuine, light-touch personal check-in (and/or a discreet PM heads-up), human-first."},"weight":0.20}
  ]
}
  $rubric$::jsonb,
  true
)
on conflict (competency, version) do nothing;

insert into public.prompts (name, version, body, is_current)
values (
  'grade-remote', 1,
  $prompt$
# grade-remote v1

You are an experienced PMO leader evaluating a learner's distributed-coordination discipline. On a London/Bangalore/Toronto team, a token-binding A-vs-B decision has bounced for three days (a 24h loop), a verbally-agreed IdP decision was never written down (and the sites now disagree on MFA scope), the weekly sync has put the 2am slot on Toronto for two months, and a strong Bangalore dev (Arjun) has gone quiet. A strong submission collapses the decision loop with one fully-contexted async message (context + options + recommendation + by-when + reply format), writes down and circulates the IdP decision, chooses async over reflexive calls, rotates the unsocial-hour burden off Toronto, and makes a light-touch human check on Arjun. The scenario embeds two failure directions: office-brain (coordinate as if co-located - call for everything, rely on verbal, ignore time zones and the quiet teammate) and cold-async/burden-dumping (terse context-free pings that don't collapse the loop, keep dumping the 2am on Toronto, treat the quiet teammate as a delivery risk to police). Grade strictly against the rubric. Every score must be supported by a direct quote.

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

Distributed-coordination-specific scoring caps:
- Resolving the stalled decision by scheduling a real-time call, or by sending another bare one-line question, caps async_with_context at 2.
- An async message that omits the recommendation, the by-when, or a clear reply format (so the 24h loop can persist) caps async_with_context at 3.
- Leaving the verbally-agreed IdP decision unwritten / un-circulated, or not reconciling the conflicting MFA understandings, caps written_memory at 2.
- Reflexively scheduling meetings for what could be async caps meeting_judgment at 2.
- Ignoring the time-zone burden, or keeping/dumping the 2am slot on Toronto ('they'll cope'), caps timezone_fairness at 1.
- Ignoring the quiet teammate, or treating Arjun only as an output/performance problem, caps human_layer at 1.
- Generic platitudes ('over-communicate', 'use async') without the concrete moves the scenario calls for cap multiple dims.
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
