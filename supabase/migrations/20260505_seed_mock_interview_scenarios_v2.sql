-- Hand-authored mock-interview scenarios v2.
--
-- The original 5 seeded scenarios (m01-q1 through m20-q1) plus 6 AI-generated
-- scenarios via the ↻ button left coverage gaps in: behavioural-medium,
-- behavioural-hard, procedural-easy, judgment-easy. This seed adds 7 hand-
-- written scenarios to cover those cells. All scenarios are PC-specific
-- (technology / IT context to match the AI-content scoping locked in 2026-05-03).
--
-- ON CONFLICT (slug) DO NOTHING keeps this idempotent — re-applying is safe.

insert into public.mock_interview_scenarios
  (slug, prompt, category, difficulty, competency, sort, is_published, is_ai_generated, rubric_summary)
values
  (
    'stakeholder-priority-disagreement',
    'You are coordinating a customer-portal upgrade. The Director of Marketing wants the new analytics dashboard prioritized for next sprint; the Director of Customer Service wants the live-chat widget prioritized instead. Both have steering-committee leverage and both have legitimate arguments. Engineering has capacity for one feature, not both. The PM is on PTO this week. Walk me through how you handle the next 24 hours.',
    'behavioural',
    'medium',
    'stakeholder management and trade-off framing',
    207,
    true,
    false,
    'Strong answer: surfaces the conflict explicitly (does not paper over), gathers the missing decision criteria (impact data, customer signal, OKR alignment), names a clear escalation path given PM PTO, frames the trade-off in business terms not feature terms, sets a deadline for the decision so engineering is not blocked. Weak answer: tries to "make both happy", does not acknowledge the PM-absence escalation gap, no time-boxing.'
  ),
  (
    'peer-pc-deliverable-slip',
    'You and another Project Coordinator (M., a peer with 6 months tenure to your 18) jointly own the rollout for a new internal tool. M. has missed two committed deliverables in three weeks — first the user-acceptance test plan, then the training schedule. Both slips landed in your lap to recover. M. is friendly, responsive, and keeps saying "this week for sure". Your shared manager has not flagged it. How do you raise this with M.?',
    'behavioural',
    'medium',
    'peer feedback and accountability',
    208,
    true,
    false,
    'Strong answer: addresses M. directly first (not the manager), uses specific examples and impact rather than character framing, separates intent from impact, offers help/diagnosis before judgment ("what is getting in the way?"), agrees on a concrete checkpoint, and sets the threshold at which manager involvement is needed. Weak answer: jumps to manager, vague "you keep slipping" framing, ultimatum-style, no diagnosis of why.'
  ),
  (
    'steering-bad-news-three-weeks-late',
    'Three days before steering, you confirm the integration build is going to slip three weeks past the committed go-live date. The slip is real (a vendor SDK regression you cannot work around) and the team has been working evenings to no avail. Your sponsor expects the green status he saw last steering. The CIO will be in the room for the first time this cycle. What do you do between now and Tuesday morning?',
    'behavioural',
    'hard',
    'executive communication and bad-news delivery',
    209,
    true,
    false,
    'Strong answer: pre-briefs the sponsor today (no surprises in the room), brings a short written assessment with cause / impact / options / recommendation / decision-needed, separates root cause (vendor regression) from accountability (we did not catch it earlier — here is what we are changing), offers two or three concrete recovery paths with trade-offs not just "we will work harder", names what they need from the room. Weak answer: surprises the sponsor, leads with the slip not the recovery, no decision ask, blames vendor without owning the early-warning gap.'
  ),
  (
    'underperforming-team-member-no-authority',
    'An engineer on your project team — not your direct report — has missed three committed merge dates in five weeks. Code reviews show the work is fine when it lands; the problem is consistency and predictability. The engineer is well-liked and their manager (your peer) has not raised it. You do not have hire/fire authority. The next milestone is in four weeks and the current trajectory will miss it. What do you do?',
    'behavioural',
    'hard',
    'managing without authority and team performance',
    210,
    true,
    false,
    'Strong answer: works the data first (timeline of slips, dependencies blocked), has a direct conversation with the engineer focused on diagnosis and structure (is the work scoped right? blockers? capacity?), then a parallel conversation with their manager that frames pattern + project risk + concrete asks, never positions themselves as the engineer''s evaluator, escalates to project sponsor only if peer-manager refuses to engage. Weak answer: goes straight to manager or sponsor, frames the engineer as "the problem", confuses persuasion with authority.'
  ),
  (
    'weekly-status-report-template',
    'Walk me through the weekly status report you would send for a six-month software-integration project mid-build. Tell me the sections you would always include, what goes in each, what you would deliberately leave out, and how it changes for an audience of the steering committee versus the project team.',
    'procedural',
    'easy',
    'status reporting and audience awareness',
    211,
    true,
    false,
    'Strong answer: leads with status + headline (RAG or equivalent) + one-line "the thing to know this week", names sections like progress / risks / decisions needed / asks / what is next, distinguishes facts from interpretation, deliberately excludes activity-as-progress ("had 12 meetings"), changes for steering by tightening to decisions and asks, changes for team by adding actionable detail and unblocking calls. Weak answer: dump of activities, no headline, identical content for both audiences, no "decisions needed" section.'
  ),
  (
    'two-low-stakes-stakeholder-asks',
    'It is 9:15am Wednesday. Two stakeholders just emailed you within ten minutes of each other. The first wants the meeting notes from last Friday''s vendor sync (their team needs them by EOD for a planning session). The second wants you to look over the wording of an internal announcement they are sending tomorrow. Neither is critical; both are reasonable. Your morning is otherwise clear. How do you handle the next 30 minutes?',
    'judgment',
    'easy',
    'prioritization basics and small-decisions hygiene',
    212,
    true,
    false,
    'Strong answer: acknowledges both quickly with a realistic ETA (do not let either spin), does the meeting-notes ask first because it has a hard deadline today and unblocks another team, returns to the announcement review with a focused 10-15 minute pass, treats the morning as a chance to move two items off others'' plates not as a productivity puzzle. Weak answer: starts the announcement review without responding to the meeting-notes ask, multitasks both at once, treats them as equally urgent, no acknowledgement to either before starting.'
  ),
  (
    'decide-or-escalate-three-examples',
    'Project coordinators handle a steady stream of small decisions. Some you should make on the spot, some you should escalate, some you should decide AND inform. Walk me through your rule of thumb for which is which, then give me three real-feeling examples from a software project — one of each.',
    'judgment',
    'easy',
    'decision authority and escalation judgment',
    213,
    true,
    false,
    'Strong answer: articulates a usable heuristic (reversibility, blast radius, who-needs-to-know, am-I-the-best-informed-person), distinguishes "decide and inform" from "decide silently", examples are concrete and plausible (e.g. decide: a meeting time change; decide-and-inform: rescheduling a non-critical demo; escalate: a vendor cost overrun beyond pre-approved limits), shows comfort owning small calls. Weak answer: vague "depends on context", no heuristic, examples are all escalations (signals decision-aversion), or all decides (signals overreach).'
  )
on conflict (slug) do nothing;
