# Schedules, Dependencies, and the Critical Path

## The schedule that lied every Friday

A regulatory project, year seven. The coordinator inherits a schedule that lies, politely, every Friday for six weeks.

The schedule shows the project ninety-four percent complete at the end of month three. Every Friday, the coordinator dutifully updates percentages, produces a burndown chart, and sends it to the PM and sponsor. Every Friday, the picture is rosy. Every Friday, people nod.

In week seven, a technical lead asks, offhandedly, whether UAT still starts on the first of next month. *Yes,* says the coordinator — the schedule says yes. The technical lead says he is surprised. His team has not yet completed the integration work UAT depends on, and they are not, in his judgment, within a week of completing it. They are within three.

The coordinator walks the tasks. The integration work shows eighty-eight percent complete. The low-level line items show completion estimates entered by a team lead who has been rounding up for weeks to avoid raising alarms. The aggregate is a rollup of soft numbers. The soft numbers reflect people's hopes, not their progress.

UAT slips by three weeks. The sponsor is furious — not at the slip, but at the surprise. *"I have been looking at green for seven weeks. What changed?"* Nothing had changed. **The green had not been true in the first place. It was the rollup of a hundred small optimisms.**

A schedule is not a file you update. **A schedule is a model of reality that you continuously verify.** If the verification is shallow — if you accept what people tell you without cross-checking — the schedule becomes a polite fiction. This chapter is about how to keep it honest.

## What a schedule actually does

A schedule translates the work breakdown into time. For each work package: when will this start? when will it finish? what must happen before it can start? what is waiting on it to finish? who is doing it?

A good schedule answers four questions at any moment:

1. What is the **current end date** of the project?
2. What is the **critical path** — the sequence of dependent work that determines that end date?
3. What is **at risk of slipping**?
4. What, if it slipped, **would push the end date out**?

A schedule that cannot answer those four questions is not doing its job, no matter how many bars are on its Gantt chart.

## Dependencies, and the kinds that matter

A dependency is a relationship where one work item cannot start (or cannot finish) until another has reached a certain state. There are four textbook types — finish-to-start, start-to-start, finish-to-finish, start-to-finish — and in practice the first is by far the most common.

The important distinction is not between types but between **categories of source**:

| Category | What it is | Why it slips |
|---|---|---|
| **Internal** | Between work items inside the project (design must be approved before dev can start) | Easiest to manage — both parties are on the team |
| **External** | On parties outside the project (vendor delivery, third-party system, regulatory approval) | You do not control them; accuracy depends on info you cannot verify |
| **Resource** | On people/assets shared with other projects (a specific architect, a queued test environment) | Often invisible in schedules that focus on task flow but not resource availability |
| **Decision** | On choices that have not yet been made (vendor selection, architecture pattern) | Schedules usually assume decisions will happen "on time" without a plan for making that true |

As coordinator, your job with dependencies is partly mechanical — capturing them in the schedule — and partly investigative. **You surface the dependencies the team has not named, especially external, resource, and decision dependencies.** A schedule showing only internal task-to-task dependencies is a schedule whose slippage will come from directions it did not predict.

## The critical path

The critical path is the sequence of dependent activities that determines the project's end date. **Any slip on a critical-path activity slips the project.** Slips on activities *off* the critical path absorb into slack — they slip, but the end date does not move, as long as they don't slip so far that they become critical.

Every project has a critical path. Not every project knows what it is. This is one of the most common and most consequential failures in schedule management.

Identifying the critical path is straightforward in principle: walk the schedule from end date backwards, following the longest chain of dependent activities. Most scheduling tools highlight it automatically. **But the critical path shifts as the project progresses** — activities that were slack become critical when earlier activities slip. A project's critical path in month one is often not its critical path in month four.

Your practical discipline is to know the **current** critical path at all times, and focus attention there.

- A critical-path activity going amber is a **project-level risk**.
- A non-critical activity going amber may still be serviceable within slack.

A common mistake is treating all slippages as equally urgent. They are not. A one-week slip on a critical activity may push the project out by a week. A three-week slip on an off-path activity may push the project out by zero weeks — it simply consumes slack. Teams that do not distinguish between these waste attention on one and miss the severity of the other.

## Float, slack, and buffer

Related concepts. **Float** (or **slack**) is the amount of time a non-critical activity can slip without affecting the end date. **Buffer** is intentional contingency built into the schedule to absorb unexpected variability.

Mature scheduling practice maintains explicit buffer at **named points** — before major milestones, before integrations, before external dependencies. Buffer is not padding on every activity; that approach produces a schedule that is uniformly padded *and* uniformly optimistic, because teams unconsciously consume their task-level buffers. Buffer works better as a small number of named reserves held at specific points by the PM.

As coordinator, **track buffer consumption.** If the project started with two weeks of buffer before the integration milestone and has used one week in the first third of execution, that is information the PM needs. **Burning buffer faster than you are burning work is a warning sign that the estimates were optimistic.**

## Keeping the schedule honest

The pattern this chapter opens with — percentages rolling up from soft inputs — is the single most common way schedules lie. Defences against it are specific.

**Verify against evidence, not assertion.** When a workstream lead says a package is eighty percent complete, ask what that percent is based on. If the answer is *"we're tracking well,"* that is an assertion. If the answer is *"eight of the ten sub-tasks are done, and the remaining two have an estimated four days of work left,"* that is evidence. Treat them differently.

**Use binary or coarse completion for small packages.** Do not track percent complete on short packages. Track *not started / in progress / done*. Percent complete on a two-week task is noise. Binary status is less work and more accurate.

**Cross-check with actuals.** If a package was estimated at eighty hours and the team has logged forty hours, the remaining work is probably about forty hours — finishing on estimate. If the team has logged sixty hours and the package is reported fifty percent complete, something is wrong: either the estimate was low, the progress report is optimistic, or hours are being miscategorised. **The hours-vs-completion ratio is one of the most reliable signals you have.**

**Walk the critical path weekly.** Once a week, trace the current critical path from start to end. For each activity on it, get a real status update — ideally from the person *doing* the work, not just from the workstream lead. Twenty minutes of work, catches problems faster than any dashboard.

**Push back on silent re-planning.** When a team member says *"we're tracking well"* after a date has already slipped in practice, the schedule needs to be **updated**, not reassured. Help your PM insist on this. **Schedules that are updated reflect reality; schedules that are defended in meetings reflect hope.**

## Reporting schedule status

Your status report usually includes a schedule view. The tempting presentation is a Gantt chart with coloured bars. The useful presentation is shorter and more specific.

A good schedule status answers:

- *Are we on track for the next major milestone?*
- *What has slipped, and what is the impact?*
- *What is at risk of slipping, and when will we know?*

Three sentences, not three pages. The detailed Gantt can be attached for those who want it; the narrative is what sponsors read.

When a slip has occurred, **name it precisely**. The chapter's exemplar:

> *"Integration delivery slipped from May 28 to June 11 due to vendor capacity; testing start pushed from June 1 to June 15; milestone three-week slip absorbed into existing buffer, no end-date impact."*

This tells the reader what happened, why, what the downstream effect is, and whether the end date is moving. **It treats the sponsor as capable of hearing bad news, which they are.** The sponsor on the regulatory project at the top of this chapter was not furious at the three-week slip. He was furious that he had been looking at green for seven weeks. The slip cost him weeks; the surprise cost him trust.

## The hours-vs-completion ratio is your friend

The most reliable signal for spotting a soft percentage is the relationship between **hours consumed** and **work completed**. The arithmetic is simple. If a package was estimated at 100 hours and the team has logged 50 hours, you would expect the package to be roughly 50% complete. If it is reported at 80%, one of three things is true: the estimate was way too high, the report is optimistic, or hours are being logged elsewhere.

Walk that check on every package on the critical path. It is the single discipline that catches the rounding-up pattern fastest. The "94% for six weeks" failure the chapter opens with would have been visible in week three if anyone had asked: *the team has logged 80% of the budgeted hours and the work is reported at 94% — what is the gap?*

The cross-check is also a kindness. Workstream leads under pressure round up because the alternative is to deliver bad news every Friday. Asking *"what evidence supports the 80%?"* gives them a structured place to surface the real situation without losing face. *"The estimate was light by 30%"* is an easier sentence than *"I have been overstating progress for a month."* Cross-checking against actuals lets you ask the first question and get to the second.

When hours data is not available — many projects do not track time at the package level — substitute sub-task completion. *"Eight of ten sub-tasks complete, the remaining two estimated at four days"* is evidence. Anything coarser than that is assertion. The discipline transfers.

## Audit, don't rewrite

When you are asked to review a schedule — by your PM, ahead of a steering committee — your job is to **surface what the snapshot is hiding**, not to redraft it. The leads who built it are the right people to update it. Your contribution is the careful read, the cross-check against actuals, the named omission, the precise question. Producing your own v2 schedule and recommending it go straight to the committee is the same anti-pattern as the WBS coordinator who rewrites the WBS solo: it produces an artefact the doers did not contribute to and will not believe.

The schedule is built by the doers and maintained by the PM. **You audit it, and you protect the project from the polite fiction.**

## Tomorrow, specifically

Five moves.

1. Open your project's schedule. Identify the **current** critical path — write down the five-to-ten activities on it. Note whether it matches what was the critical path at kickoff. If it has shifted, that shift is information that probably has not been broadcast.

2. For each critical-path activity, form a view of **actual status, not just reported status**. Talk to the person doing the work where you can. Notice whether the two match.

3. Check whether your schedule has **named buffer**, and how much has been consumed. If buffer has been silently absorbed outside the named points, that is the buffer-burning-faster-than-work signal — surface it.

4. Pick one work package that has been reporting the **same percentage complete for more than two status cycles**. That is the rounding-up signal. Investigate.

5. Draft one status sentence about the schedule that tells a senior reader the truth in twenty words or fewer. If you cannot, your grasp of the schedule is less solid than it needs to be — the next two weeks should fix that.

Next chapter: running meetings that people don't hate.
