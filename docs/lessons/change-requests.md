# Change Requests — Controlling Chaos Without Becoming the Blocker

## The change process that nobody used

A large digital transformation. The change control process was comprehensive — a template with sixteen fields, a change control board that met weekly, a formal impact analysis requirement, an approval workflow routing through four parties before any change was baselined.

**Nobody used it.**

What happened instead: scope changes were negotiated in hallway conversations, agreed in Slack, quietly absorbed into the work. A workstream lead would realise the integration needed an additional feature; mention it to the PM; the PM would say *"do it"*; the feature would get built. The official CR process never engaged. By month six, the project's actual scope had drifted meaningfully from its documented scope, and the change log was almost empty.

This was a problem not because changes are bad — they are inevitable — but because **the drift was invisible**. The sponsor believed the project was on the original scope. The budget tracker did not reflect the added work. The plan was silently overcommitted. When the inevitable pressure arrived, the project looked like it was underperforming on the original scope, when in reality it was performing adequately on a scope that had grown by perhaps fifteen percent.

The change control process had failed, but **not by being too loose**. It had failed by being too heavy. Sixteen fields, four approvers, a weekly board. The friction was so high that everyone worked around it.

The redesign: small changes (under five days, no budget impact) went through a one-page template approved by the PM. Medium changes (up to fifteen days, modest budget) went through a more thorough template, reviewed by the PM and logged, but not requiring a board. Large changes (anything beyond, anything touching external commitments, anything affecting the critical path) went through the full formal process. **Within three weeks, the change log had thirty entries. Scope drift became visible again.**

This chapter is about change requests as a practical discipline — neither theatre nor bureaucracy, but a tool that actually tracks how a project's scope evolves in flight.

## What a change request is for

A change request is the formal mechanism for proposing a change to something the project has committed to — scope, schedule, cost, resources, approach. Anything that was baselined and is now being reconsidered.

The purpose is threefold:

- **Make the change visible.** Changes that happen silently distort the plan without anyone noticing. Visible changes are tracked, analysed, and either approved or rejected deliberately.
- **Analyse the impact before committing.** A change that looks small in isolation may have cascading effects — on dependencies, on other workstreams, on cost, on risk. The CR process forces analysis before the change is absorbed.
- **Give the right decider the decision.** Small changes belong with the PM. Medium changes may involve sponsors or finance. Large changes belong with the steering committee. The CR process routes decisions to the appropriate authority.

A CR is not primarily about paperwork. **It is about deliberate decision-making on things that affect the project's baseline.**

## The anatomy of a good CR

A good CR — regardless of format — captures the same core content.

**What is being changed.** Specifically. Which requirements, deliverables, or commitments. Not *"we need more integration work"*; rather, *"the integration scope will be expanded to include handling of X transaction type, per stakeholder request Y."*

**Why.** The business or technical reason for the change. New information, new requirement, corrected scope, external driver. Future readers will want to understand why the baseline moved.

**Impact analysis.** What this change does to each of the **five variables** — scope, schedule, cost, quality, risk. Quantified where possible:

> *"Approximately fifteen person-days of additional development; two-week extension to integration milestone; $18,000 cost increase; no quality impact; introduces a new dependency on the X team's availability."*

**Alternatives considered.** What other options were evaluated, and why this one was selected. Often thin, but it matters — future readers want to know the alternatives were considered, not just the chosen path.

**Recommendation.** What the person bringing the CR recommends. Approve, reject, defer, modify. With reasoning.

**Approval.** Who needs to approve, and their decision.

The detail in each section scales with the change's magnitude. A small CR has a paragraph per section; a large CR has a page.

## Routing and thresholds

A workable change process has tiered thresholds:

| Tier | Approver | Typical magnitude |
|---|---|---|
| **Tier 1** | PM-level | Small changes, no material plan impact. Logged but no formal board. |
| **Tier 2** | PM + sponsor | Material cost, schedule, or scope implications within project governance scope. |
| **Tier 3** | Steering committee | Project-level commitments, external contracts, major milestones, significant budget. |

Your organisation may have these defined. If not, **agree them early with your PM and document them**. Vague thresholds produce argument; clear thresholds produce flow.

The coordinator's role in routing is often substantial. You assess which tier a CR fits in. You prepare the analysis at the appropriate depth. You schedule the review with the right approvers. You maintain the change log and communicate outcomes. **Doing this cleanly is the difference between a process that enables work and a process that blocks it.**

## The politics of change

Change requests are often politically loaded because they surface trade-offs that stakeholders would prefer remained implicit.

- A CR that **adds scope** forces the question: *who pays for it?* Is the new work absorbed by the existing budget (something else is being cut) or by an increase (someone has to find more money)?
- A CR that **removes scope** forces the question: *who loses their feature?* The stakeholder whose scope is being cut will usually fight the CR; the sponsor may have to intervene.
- A CR that **extends the schedule** forces the question: *what was originally committed, and to whom?* Extensions often require external renegotiation, and someone has to have that conversation.

The coordinator does not resolve these politics — the PM and the sponsor do. **But the coordinator prepares the CR in a way that makes the politics visible and resolvable.** A CR whose impact analysis hides the trade-offs is a CR whose politics will erupt in the meeting where approval is sought. A CR whose impact analysis names the trade-offs is a CR whose politics can be worked through before the meeting.

## Change log discipline

Every CR — approved, rejected, or deferred — goes into the change log. The log is a permanent record of how the project's baseline evolved.

The log is useful in several ways.

**At closeout**, it answers *"how much did the scope change over the life of the project?"* An answer of zero is almost always wrong — a project with no changes is a project that did not learn. An answer of fifty percent growth is usually a red flag. **Typical projects see ten to twenty percent scope growth through changes**, though the number varies widely.

**In disputes**, it resolves *"what was agreed when?"* Years after a project ends, the change log may be the document that settles who agreed to what, and when, and why.

**For learning**, the log reveals patterns. A project where most changes are scope-additions is a project whose planning underestimated scope. A project where most changes are schedule-extensions is a project whose planning underestimated duration. A project where changes cluster in one workstream is a project with a specific planning gap. **These patterns are visible only if the log is maintained.**

Your discipline is to update the log every time a CR moves through a status. *Submitted. Under review. Approved. Rejected. Deferred. Closed.* With dates for each transition. The log becomes a source of truth that other artefacts — schedule, budget, status reports — can reconcile against.

## The silent-absorption signal

An empty or near-empty change log on a multi-month project is not evidence that nothing has changed. **It is evidence that changes are happening off the log.** The chapter's framing is direct: a project with no entries after six months is almost always a project where the process has been worked around.

The diagnostic: count entries against months elapsed and project scale. If the count is implausibly low, the question is not *"why don't we have more changes?"* It is *"where are the changes that must have happened, and why aren't they here?"* The answer is usually that the process has been judged too heavy and the team has defaulted to informal absorption.

The fix, per the chapter's redesign anecdote, is **tiered routing with clear thresholds** — so that small changes have a process that fits their size and large changes have a process that does the analysis they need. Process that fits size is process that gets used.

## The CR that prevents the dispute

A side-benefit of disciplined CR analysis: a well-prepared CR closes a future dispute before it starts. The CR that arrives at the steering committee with a five-variable impact analysis, named trade-offs, and a clear recommendation gets approved (or rejected) in twenty minutes. The CR that arrives with one variable and a vague ask spawns the kind of meeting that runs ninety minutes, produces a deferral, and resurfaces three weeks later with everyone holding slightly different memories of what was actually agreed.

The well-prepared CR is also the CR that holds up later. Six months after a feature ships, when someone says *"we never agreed to that scope cut"* or *"the original plan didn't include this dependency,"* the CR analysis is what answers them. Vague analysis ages badly because the trade-offs were never written down; specific analysis ages well because the alternatives, the recommendation, and the reasoning are all there.

The investment cost is small. A CR that takes you two hours to analyse properly — talking to the right teams, working through alternatives, surfacing the politics — saves the approval meeting from being a discovery session. **The discipline pays back in the same week**, not just at closeout or audit.

## Working with workstream leads on CRs

Most CRs are drafted by workstream leads, not by the coordinator. Your role is usually to receive the draft and audit it before it goes to the PM. A few notes on doing that well.

**The audit is constructive feedback, not gatekeeping.** Workstream leads who feel the CR process is a wall stop using it (and the silent-absorption pattern returns). The framing is *"here are the gaps so this is fundable when L. sees it"*, not *"this isn't good enough."*

**Send the audit back, don't fix it for them.** The lead needs to own the analysis, the political surfacing, and the recommendation. If you rewrite the CR, the lead never builds the muscle and the PM gets a CR that the named author cannot defend in the meeting.

**Flag the broader patterns separately.** Three CRs in a row from the same workstream where impact analysis is thin is a pattern worth surfacing in your PM 1:1, not in the third CR's audit. The audit is about the artefact; the pattern is about the practice.

## Audit, don't rewrite

When a workstream lead sends you their CR for review, your job is to **audit it and recommend the specific additions and corrections**, not to rewrite it and forward it on their behalf. CR ownership is functional: the workstream lead owns the change and the analysis, the PM owns the routing decision, the PC owns the audit and the log. Collapsing all three roles — by drafting v2 yourself and offering to send it — produces a CR that the lead did not author and that the approver sees as already-decided. **Audit. Send back. Let the lead revise.** Same line that applies to the WBS, the schedule, the meeting setup, the minutes, the status report.

## Tomorrow, specifically

1. **Find your project's change log.** Count the entries. Is the count plausible given the months elapsed and the project scale? If you have six weeks in and no entries, either nothing has changed (unlikely) or changes are happening off the log (likely).

2. **Ask your PM whether the change process is working as intended.** Specifically: when changes come up, are they routed through the CR process by default, or are they discussed and absorbed first and logged later (if at all)?

3. **Draft one CR for something that has changed on your project but has not been formally logged.** Present it to your PM as a catch-up entry, not as a critique. *"I noticed we added X two weeks ago without a CR; I'd like to log it retroactively to keep the record clean."*

4. **Review the change thresholds with your PM.** Are they clearly defined? Do they match how changes are actually being decided? If the documented thresholds are different from the operational practice, one of them needs to move.

5. **Identify one change that was approved in the last month.** Ask yourself whether its impact analysis was complete. If not, that is the template-improvement opportunity for the next one.

Next chapter: dashboards, and the uncomfortable truth of a project.
