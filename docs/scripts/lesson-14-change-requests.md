# Lesson 14 — Change Requests: Controlling Chaos Without Becoming the Blocker
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 15; reading `docs/lessons/change-requests.md`
**Lesson slug:** change-requests
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1 and Lesson 20.

---

### COLD OPEN — The change process nobody used (0:00–2:00)

*[Story slide. Direct address.]*

I want to start with a process I helped build that was, on paper, excellent — and that absolutely nobody used.

It was a large digital transformation. The change control process was comprehensive. A template with sixteen fields. A change control board that met weekly. A formal impact analysis requirement. An approval workflow that routed through four parties before any change got baselined. If you'd shown it to an auditor, they'd have nodded approvingly. It was, by every textbook measure, a serious process.

And nobody used it. Not once, really.

What happened instead was that scope changes got negotiated in hallway conversations, agreed in Slack, and quietly absorbed into the work. A workstream lead would realize the integration needed an extra feature. They'd mention it to the PM. The PM would say "do it." The feature would get built. At no point did the official change-request process engage. By month six, the project's actual scope had drifted meaningfully from its documented scope — and the change log was almost empty.

Here's why that mattered. It wasn't a problem because changes are bad. Changes are inevitable. It was a problem because the drift was invisible. The sponsor believed we were on the original scope. The budget tracker didn't reflect the added work. The plan was silently overcommitted. So when the inevitable pressure arrived, the project looked like it was underperforming on the original scope — when in reality it was performing perfectly well on a scope that had quietly grown by about fifteen percent.

---

### TOO HEAVY, NOT TOO LOOSE (2:00–3:30)

*[Statement slide]*

Now, here's the part most people get exactly backwards.

The change control process had failed — but not by being too loose. It had failed by being too heavy. Sixteen fields. Four approvers. A weekly board. The friction was so high that everyone worked around it. The process existed on paper, and not in practice.

So my PM and I redesigned it. And the redesign is the whole philosophy of this lesson, so hold onto it. Small changes — under five days of effort, no budget impact — went through a one-page template, approved by the PM, done. Medium changes — up to fifteen days, modest budget — went through a more thorough template, reviewed by the PM and logged, but no board. Large changes — anything beyond that, anything touching external commitments, anything affecting the critical path — went through the full formal process.

Within three weeks, the change log had thirty entries. Thirty. The changes had been happening all along. We'd just finally built a process that fit their size — and process that fits its size is process that gets used. Scope drift became visible again.

That's what this lesson is about: change requests as a practical discipline. Not theatre. Not bureaucracy. A tool that actually tracks how a project's scope evolves in flight — without making you the person everyone routes around.

---

### WHAT A CHANGE REQUEST IS FOR (3:30–5:10)

*[List slide: three purposes]*

Let me define the thing properly, because the definition tells you why it exists.

A change request is the formal mechanism for proposing a change to something the project has already committed to. Scope, schedule, cost, resources, approach — anything that was baselined and is now being reconsidered. That's it. If it was a commitment and you're reopening it, that's a change request.

And the purpose is threefold. First, make the change visible. Changes that happen silently distort the plan without anyone noticing. Visible changes get tracked, analyzed, and either approved or rejected deliberately. Second, analyze the impact before committing. A change that looks small in isolation may have cascading effects — on dependencies, on other workstreams, on cost, on risk. The process forces the analysis before the change gets absorbed, not after. Third, give the right decider the decision. Small changes belong with the PM. Medium changes may involve sponsors or finance. Large changes belong with the steering committee. The process routes each decision to the appropriate authority.

So here's the line I want you to keep. A change request is not primarily about paperwork. It's about deliberate decision-making on the things that affect the project's baseline. The paperwork is just how you make the decision deliberate.

---

### THE ANATOMY OF A GOOD CR (5:10–7:15)

*[List slide: the six sections]*

A good change request — and this is true regardless of format, one page or ten — captures the same core content. Six sections. Let me walk them.

What is being changed. Specifically. Which requirements, which deliverables, which commitments. Not "we need more integration work." Rather: "the integration scope will be expanded to include handling of X transaction type, per stakeholder request Y." Specificity is the whole game here.

Why. The business or technical reason. New information, new requirement, corrected scope, an external driver. This matters because future readers will want to understand why the baseline moved — and there will be future readers.

Impact analysis. This is the heart of it. What does this change do to each of the five variables — scope, schedule, cost, quality, risk. Quantified wherever you possibly can. Something like: "approximately fifteen person-days of additional development; a two-week extension to the integration milestone; an eighteen-thousand-dollar cost increase; no quality impact; introduces a new dependency on the X team's availability." Five variables. Every time.

Alternatives considered. What else was evaluated, and why this option won. This section is often thin, and it still matters — future readers want to know the alternatives were considered, not just that one path was chosen.

Recommendation. What the person bringing the change actually recommends. Approve, reject, defer, modify — with reasoning.

And approval. Who needs to sign off, and what they decided.

The detail in each section scales with the change's magnitude. A small change gets a paragraph per section. A large one gets a page per section. But the sections themselves don't change.

---

### ROUTING AND THRESHOLDS (7:15–8:50)

*[List slide: three tiers]*

Now, routing — because this is where a lot of the coordinator's real work lives.

A workable change process has tiered thresholds. The specific numbers depend on the project, but the pattern is consistent. Tier one: PM-level approval, for small changes that don't materially affect the plan. Logged in the change log, but no board. Tier two: PM-and-sponsor approval, for medium changes — material cost, schedule, or scope implications, but still inside the project's governance scope. Tier three: steering-committee approval, for large changes — project-level commitments, external contracts, major milestones, significant budget.

Your organization may already have these thresholds defined. If it does, learn them cold. If it doesn't — and this happens more than you'd think — you and your PM should agree them early and write them down. I'll say this as plainly as I can: vague thresholds produce argument; clear thresholds produce flow. Every time a thresholds is fuzzy, somebody gets to argue about which tier a change belongs in, and that argument is pure friction.

And the coordinator's role in routing is often substantial. You assess which tier a change fits. You prepare the analysis at the right depth — not a page for something that needs a paragraph, not a paragraph for something that needs a page. You schedule the review with the right approvers. You maintain the log and you communicate the outcomes. Doing all of that cleanly is the difference between a process that enables work and a process that blocks it. That difference is you.

---

### THE POLITICS OF CHANGE (8:50–10:20)

*[Statement slide, then list]*

Here's the part the template never tells you about. Change requests are often politically loaded — because they surface trade-offs that stakeholders would much rather kept implicit.

A change that adds scope forces a question nobody wants to ask out loud: who pays for it? Is the new work absorbed by the existing budget — meaning something else gets cut — or by an increase, meaning someone has to find more money? A change that removes scope forces a different question: who loses their feature? The stakeholder whose scope is being cut will usually fight the change, and the sponsor may have to step in. And a change that extends the schedule forces: what was originally committed, and to whom? Extensions often mean external renegotiation, and somebody has to go have that conversation.

Now — and this is important — the coordinator does not resolve these politics. The PM and the sponsor do. That's not your call to make. But the coordinator prepares the change request in a way that makes the politics visible and resolvable. A change request whose impact analysis hides the trade-offs is a change request whose politics will erupt in the very meeting where approval is sought. A change request whose impact analysis names the trade-offs is one whose politics can be worked through before the meeting. You're not playing the politics. You're laying them on the table so the right people can.

---

### CHANGE LOG DISCIPLINE (10:20–12:00)

*[List slide: closeout · disputes · learning]*

The change log. Every change request — approved, rejected, or deferred — goes into it. The log is the permanent record of how the project's baseline evolved, and it earns its keep in three ways.

At closeout, it answers: how much did the scope change over the life of the project? And the answers are diagnostic. An answer of zero is almost always wrong — a project with no changes is a project that didn't learn. An answer of fifty percent growth is usually a red flag. Typical projects see ten to twenty percent scope growth through changes, though it varies widely. In disputes, it resolves "what was agreed when?" Years after a project ends, the change log may be the single document that settles who agreed to what, and when, and why. And for learning, the log reveals patterns. A project where most changes are scope-additions underestimated scope in planning. One where most changes are schedule-extensions underestimated duration. One where changes cluster in a single workstream has a specific planning gap right there. But — and here's the catch — these patterns are only visible if the log is actually maintained.

So your discipline is this: update the log every single time a change request moves through a status. Submitted. Under review. Approved. Rejected. Deferred. Closed. With dates on every transition. Do that, and the log becomes a source of truth that your other artifacts — the schedule, the budget, the status report — can all reconcile against.

And one diagnostic to carry with you. An empty change log on a multi-month project is not evidence that nothing changed. It's evidence that changes are happening off the log. If you're six weeks in with no entries, the question isn't "why don't we have more changes." It's "where are the changes that must have happened, and why aren't they here." The answer, almost always, is that the process got judged too heavy and the team defaulted to silent absorption.

---

### AUDIT, DON'T REWRITE (12:00–13:15)

*[Example slide: weak CR vs strong CR, then the rule]*

One last thing, and it's the one that keeps you from becoming the blocker.

Most change requests aren't drafted by you. They're drafted by the workstream leads. Your job is usually to receive the draft and audit it before it goes to the PM — and how you audit matters enormously.

The audit is constructive feedback, not gatekeeping. Workstream leads who feel the process is a wall stop using it, and then the silent-absorption pattern comes right back. So the framing is "here are the gaps so this is fundable when the PM sees it" — not "this isn't good enough." And here's the rule I want you to hold: send the audit back, don't fix it for them. The lead needs to own the analysis, the political surfacing, the recommendation. If you rewrite the change request, the lead never builds the muscle, and the PM gets a request that the named author can't actually defend in the room. Audit. Send back. Let the lead revise.

Ownership here is functional, and it's worth saying out loud. The workstream lead owns the change and the analysis. The PM owns the routing decision. You own the audit and the log. Collapse all three by drafting version two yourself, and you produce a change request the lead didn't author and the approver reads as already-decided. It's the same line that applies to the schedule, the meeting setup, the minutes, the status report. Audit, don't rewrite.

---

### WHAT YOU'RE GOING TO DO (13:15–14:25)

*[Slide: workbook brief + close]*

So here's your work for this lesson. Find your project's change log and count the entries. Ask whether that count is plausible given the months elapsed and the scale of the project. Ask your PM whether the change process is working as intended — are changes routed through it by default, or discussed and absorbed first and logged later, if at all. Then draft one change request for something that has changed but was never formally logged, and present it as a catch-up entry, not a critique. Review the thresholds with your PM — are they clear, do they match how changes are actually decided. And pick one change approved in the last month and ask honestly whether its impact analysis was complete.

*[Back on camera, slower]*

The reason I started with that process nobody used is that it's the whole lesson in one picture. A perfect process on paper and an empty log underneath it. The drift was real the entire time — it just wasn't visible. Your job isn't to build the most rigorous change process imaginable. It's to build one that fits the size of the changes, gets used, and keeps the drift visible. Controlling the chaos, without becoming the thing everyone routes around.

See you in the workbook.

---

*[End card: Lesson 14, Change Requests. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slide for the cold open; statement slides for "too heavy not too loose" and the politics opener; list slides for the three purposes, the six CR sections, the three tiers, the politics trade-offs, and the change-log uses; an example slide contrasting a weak versus strong change request; story slide for the close.

**Integrity:** The cold-open "process nobody used" anecdote and the redesign are drawn from the instructor's handbook (Ch 15), narrated in first person, including the first-person "My PM and I redesigned it" scene. The eighteen-thousand-dollar impact-analysis example is the handbook's own. No first-person scenes were fabricated. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 1 / Lesson 20 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
