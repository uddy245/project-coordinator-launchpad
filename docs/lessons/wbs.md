# The Work Breakdown Structure — How to Actually Build One

## The WBS nobody believed

The first real WBS — the first one a coordinator gets asked to help build, not just maintain — for a branch rationalisation programme at a regional bank. The PM, calm and thorough, makes an early call: build the WBS in a two-day workshop with the core team rather than draft it alone and circulate it.

The coordinator is sceptical. Past PMs have built WBSs alone. Faster. The output looks similar. Burning two days of eight people's time on something the PM could produce in a weekend feels excessive.

Then the workshop happens.

On the first morning, a developer notices that a workstream the PM had assumed was a single package is actually two — the front-end rebuild and the back-end integration have different teams, different risks, and different durations. Treating them as one line item would have produced a schedule that hid the real dependency.

On the second morning, the change management lead points out that the PM's decomposition has no package for end-user communication, which she calls "half my job for the next four months."

By the end of the second day, the WBS has seventeen more leaves than the PM had sketched alone, and four items have been consolidated or dropped.

The new WBS is better. More importantly, **the eight people who built it believe it.** When execution starts, nobody says *"that's not really what I signed up for."* They had signed up for it. They had written it.

That workshop is the lesson. The WBS is not a diagram. It is a shared model of the work, built by the people who will do it, with the artifact as evidence. **The diagram is the residue. The model is the point.**

This chapter covers the WBS as both — the mechanics (the 100% rule, decomposition principles, structure) and the process, which is where most of the value actually lives.

## What a WBS is, and what it isn't

The work breakdown structure is a hierarchical decomposition of the total work required to complete the project, organised from the project outcome at the top down to individual work packages at the bottom. Each level breaks the level above into its constituent parts. The lowest level — the leaves — are work packages small enough to estimate, schedule, and assign.

What a WBS is *not*:

- **Not a task list.** A task list is a flat enumeration of things to do. A WBS is a structured decomposition that answers "what does this project consist of?" at multiple levels of granularity. A senior stakeholder reading the top two levels should understand the shape of the project. A delivery team member reading the bottom two levels should understand their specific work.
- **Not a schedule.** A schedule adds dates, durations, dependencies, and resources. The WBS is the *what*; the schedule is the *when*. You build the WBS first and derive the schedule from it. A WBS without a schedule is incomplete as a plan but still useful as a scope agreement. A schedule without an underlying WBS is usually a schedule built on invisible assumptions.

## The 100% rule

The core discipline: **the work captured at any level must represent 100% of the work needed at that level. No more, no less.**

*No more* means you do not include work outside the project's scope. If the WBS has packages for things the project will not deliver, the project will be confused about its own boundaries.

*No less* — this is where most WBSs fail — means you do not omit work that is inside scope. The recurring omissions, in order of frequency:

| Category | What it covers | Where it hides if missing |
|---|---|---|
| **Project management overhead** | Status reporting, governance, steering prep, RAID maintenance, change-control admin | Absorbed into PM and coordinator time, unbudgeted |
| **Change management** | Stakeholder engagement, branch readiness, comms cadence, adoption checks | Line managers; usually fails quietly at rollout |
| **Training** | Needs analysis, materials, train-the-trainer, per-wave delivery, reinforcement | "Soft launch" time at each site, extending wave durations |
| **Documentation** | Runbooks, troubleshooting guides, admin/support docs, KT artefacts | Written under duress at the end, often skipped |
| **Transition to operations** | Ops onboarding, support tooling, KT sessions, formal handover decision | Ad-hoc handoff that ops resists or rejects |
| **Hypercare / warranty** | Bridging period after go-live where the project still owns issues | Operations capacity that was already at full utilisation |
| **Closure** | Lessons learned, financial closeout, contract closeout, artefact archival | Nobody does it; the project just stops |

When these are missing from the WBS, the work happens anyway — someone does it — but the effort was not planned, the cost was not budgeted, and the schedule did not account for it. The project is "delivered" while pieces of it are being absorbed by people who never agreed to absorb them.

**The practical test.** When you look at a WBS, ask: *if this is 100% of the work, and the team does exactly what is listed, will the project be complete?* Walk from kickoff to closure. Do kickoff activities appear? Do weekly status reports have a home? Does user training appear? Does transition to operations have packages? Does closure? If any are missing, the WBS does not meet the 100% rule.

Your role as coordinator is often to catch these omissions. You are attuned — from your own experience — to the categories of work that get forgotten when technical teams focus on the build.

## Decomposition principles

How do you decide what to break down and how far?

A work package should be small enough to be estimated with reasonable accuracy, assigned to a single owner, and tracked as a unit. The common rule of thumb is **the 8/80 rule**: a package should be between eight and eighty person-hours of work.

- Smaller than eight — the decomposition is probably too fine. You are turning tasks into rituals.
- Larger than eighty — the package hides too much variability. You cannot estimate a hundred-and-fifty-hour block accurately because you do not yet know what is in it.

Four principles worth applying.

**Decompose by deliverable, not by activity.** The WBS should be organised around the things the project will *produce*, not the actions the team will *take*.

- "Build integration" is a deliverable.
- "Meet with vendor, write specifications, review drafts" are activities.

Activities belong in the schedule; deliverables belong in the WBS. The distinction seems small but it matters — activity-oriented WBSs omit outputs and over-emphasise process. Status reports against an activity-WBS say "70% of activities done" without anyone knowing whether the deliverable is actually usable.

**Decompose to a consistent level.** If one branch is decomposed to five levels and another to two, the project is saying it understands one area much better than the other. This may be legitimate — some work is better understood at the start — but it should be deliberate. Inconsistent decomposition is usually a signal that the planning was uneven, and the underdeveloped branch is where surprises will surface.

**Decompose by who will do the work.** If two packages would be done by completely different teams with different skills and different timelines, they should be separate packages. If two packages would be done by the same team as a single flow, they may be combinable. The WBS should make assignment easy, not difficult.

**Stop decomposing when further decomposition would not help you plan.** If a package is small enough to estimate and assign, stop. You are not trying to describe every hour. You are trying to describe the project at a level that supports planning and tracking.

## Building the WBS collaboratively

The best WBSs are built by the people who will do the work, facilitated by the PM and often supported by the coordinator. The classical workshop format:

The workshop convenes the core team — typically six to twelve people including PM, coordinator, workstream leads, and key SMEs. Duration is one or two days depending on project size. The output is a WBS drafted together, captured in real time, agreed at the workshop's end.

The workshop opens with the project outcome — a single statement of what the project will produce, as concrete as possible. This is the top of the WBS. The team works down level by level, identifying major components, breaking each into deliverables, breaking deliverables into packages.

**The facilitation discipline matters.** The facilitator keeps the conversation focused on *what* the project will produce, not yet on *how* it will be done. The team drifts into schedule or resource discussions; the facilitator brings it back. Post-it notes on a wall, sticky-note software, or a hierarchical list on a shared screen all work as capture mechanisms.

**The coordinator's three jobs in the workshop:**

1. **Keep the WBS captured accurately and visibly as it emerges.** People need to see their contributions land.
2. **Surface the categories of work that tend to be forgotten** — the administrative, coordinative, and transitional items. This is the coordinator's specific contribution. The technical leads will not name PMO overhead; you will.
3. **Track the decisions and dependencies that emerge** in the conversation. Many of them will feed into the schedule, risk register, and stakeholder plan.

After the workshop you often do the cleanup — rationalising the structure, standardising the language, numbering the items, producing a cleaned version for review. The final WBS should go back to the team for confirmation before it is baselined.

**When the workshop is impossible.** Sometimes the calendar or the budget will not allow a one-or-two-day session. The middle option is a structured half-day walkthrough with the workstream leads (three hours, not two days) — same facilitation discipline, same coordinator jobs, narrower participation. The fallback below that is per-workstream walkthroughs (45 minutes each). That is worse because you lose the cross-workstream dependency capture, but it preserves doer-buy-in. **The thing not to do is baseline a solo-authored WBS and call team review a "courtesy."** The doers' contribution is the value; skipping it is skipping the point.

## What the WBS feeds

The WBS is the hub of project planning. Several artefacts flow from it:

- **The schedule** takes each work package and assigns duration, dependencies, and resources. The WBS provides the work; the schedule provides the timing.
- **The budget** rolls up estimated cost per work package (labour cost = hours × rate, plus non-labour cost) — aggregating from leaves to higher levels. Cost can then be discussed at any level of the hierarchy.
- **The responsibility assignment matrix (RAM, often fed from the RACI)** identifies who is responsible for each package. Every package should have exactly one accountable party.
- **The risk register** can be built by walking the WBS and asking, at each leaf, *what could go wrong here?* Packages with higher uncertainty produce more risks.
- **The reporting structure** mirrors the WBS. Status reports at the workstream level aggregate status from the packages within. Dashboards roll up from the leaves.

Because so much depends on the WBS, **errors propagate.** A missing package becomes missing schedule activities, missing budget, and missing status tracking. A WBS leaf framed as an activity rather than a deliverable becomes a schedule line that says "in progress" indefinitely because nobody can answer "is the deliverable complete?". The 100% rule matters because the cost of catching omissions at build time is hours; the cost of catching them later is months.

## Maintaining the WBS through execution

The WBS is rarely revised wholesale during execution, but it evolves. New packages are added via change requests. Packages are sometimes split when they turn out to be larger than expected. Packages are closed as their work completes.

Your role is to keep the WBS current and to ensure that when change requests are processed, the WBS is updated to reflect the change. **A CR that adds scope but does not update the WBS produces a project where the official scope (in the WBS) differs from the reality (what the team is building).** That gap is a source of confusion at every subsequent stage.

## Tomorrow, specifically

Five moves.

1. Find your project's WBS. If it exists, read it. Walk it against the 100%-rule omission table above. Are there categories of work missing?
2. Check whether status reporting and RAID entries trace back to WBS items. If not, the WBS has drifted from operational use.
3. If you are early enough that a WBS is still being built, volunteer to help run the workshop. If you are later, volunteer to help with a refresh.
4. Identify one package that has been "in progress" for longer than its estimate would suggest. The overrun is often a sign that the package should have been decomposed further — it was a hundred-and-fifty-hour block that hid a forty-hour problem.
5. In your next 1:1, ask your PM how they built the current WBS — alone, with the team, or something in between. The answer tells you a lot about how they think about planning, and it tells you where you can quietly add value next time around.

Next chapter: schedules, dependencies, and the critical path. The WBS gives you the work; the schedule gives you the timing — and the timing is where the project's contact with reality actually happens.
