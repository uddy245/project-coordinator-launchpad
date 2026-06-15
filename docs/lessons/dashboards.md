# Dashboards and the Uncomfortable Truth of a Project

## The dashboard that was beautiful and useless

A programme in the mid-2010s had a dashboard that won an internal award. Eleven visualisations, four colours, updated daily, available on a shared portal. Senior leaders praised it. The programme's management cited it as evidence of rigorous governance.

The dashboard was useless.

It showed percentages of milestones completed, hours burned, risk counts, defect counts, and a dozen other metrics. Every metric was technically accurate. **What it did not show was whether the programme was going to succeed.**

- **Milestones completed:** showed about ninety percent at any time. But the milestones were defined broadly enough that slipping a hard one (integration go-live) and hitting ten easy ones (each individual workshop) still showed as ninety-some-percent.
- **Hours burned against budget:** tracking close to plan. But the hours being burned were not the hours the plan assumed — the team was spending disproportionate time on rework, recorded the same way as greenfield work.
- **Risk counts:** about twenty open risks, roughly stable. But the composition had shifted; the ones that had been closed were mostly easy; the ones that remained were concentrated on the critical path. **A stable count hid a deteriorating profile.**
- **Defect counts:** trending downward — which sounds good, except that the trend reflected testing slowing down, not defects being fixed.

The dashboard told a story the programme's management wanted to tell. It did not tell the story that was actually happening. Six months later, when the programme hit the wall, the dashboard still showed ninety percent green on most metrics. The people running it were shocked. **The people below them, who knew the real story, were not.**

Dashboards are not neutral. **A dashboard is a choice about what matters, and every choice excludes something.** Done well, they are a compact way to see a project's real state. Done poorly, they are expensive flattery.

## The four questions a dashboard must answer

A project dashboard should answer four questions at a glance:

1. **Are we on track to meet our objectives?** Some measurable indicator of progress against the outcome, not just against task completion.
2. **Where is the pressure?** Which workstreams or dimensions are at highest risk. Not *"there are twenty open risks"* but *"these three risks are currently most consequential."*
3. **What has changed since last time?** Trending, not just snapshots. A red that has been red for weeks is different from one that just turned red.
4. **What does senior attention need to be on?** The three or four things where someone senior could usefully act.

**If your dashboard cannot answer these, it is decoration.**

## The metrics that actually signal

A few principles.

**Track outcomes, not just activity.** Hours burned is an activity metric; features accepted by the product owner is an outcome metric. Meetings held is activity; decisions made is outcome. **Activity metrics tell you whether people are busy. Outcome metrics tell you whether the project is producing value.**

**Track leading indicators where possible.** A defect count is a lagging indicator — quality after testing has found problems. A code-review coverage metric is leading — quality practices before problems surface. **Leading indicators give you warning; lagging indicators give you history.**

**Track composition, not just totals.** *"Twenty open risks"* is less useful than *"three critical-path risks, five medium, twelve low."* The composition is where the signal lives.

**Track trend, not just point values.** A metric with no historical comparison cannot be interpreted. Is 87% good or bad? Depends on whether it was 92% last week or 81%.

**Drop metrics that nobody uses.** If a metric has been on the dashboard for three months and nobody has asked about it or acted on it, it is noise. Remove it. Dashboards that accumulate metrics and never subtract become cluttered with items that once seemed useful.

## RAG ratings on dashboards

Same disciplines as the status report (Chapter 13). **A dashboard full of green cells for twelve weeks is reporting a lie by omission.**

One specific pattern. Some organisations use **colour-by-threshold** mechanisms — metric hits defined threshold, colour changes automatically. Useful but can be gamed (thresholds drift to whatever the current number is). The complement is **PM judgment override** — the PM can set a colour based on context, with a written rationale.

**Both mechanisms together produce more honest dashboards than either alone.** Threshold catches the obvious drift; judgment catches the situation the metric doesn't see.

## Different dashboards for different audiences

Like status reports, dashboards should be tailored.

| Layer | Purpose | Length | Cadence | Owner |
|---|---|---|---|---|
| **Team** | Operational — velocity, burndown, defects, build status, action tracker. Used to run the work. | Full screen | Daily / near-real-time | Team leads |
| **Project** | Tactical — milestone progress, workstream RAGs, budget-to-actuals, top risks, upcoming decisions. | One screen | Weekly | PM and coordinator |
| **Executive** | Strategic — overall health, objective progress, top three risks, sponsor decisions needed. | One page | Weekly or biweekly | Sponsor + steering pack |

**Most dashboard failures come from trying to serve all three audiences with one view.** The team dashboard is too detailed for the sponsor; the executive dashboard is too thin for the team. Build the layer each audience needs.

## The coordinator's role

You are often the person who maintains the dashboard day-to-day. A few specific practices.

**Verify what you publish.** When a workstream lead reports 80% complete, check whether the burn-up and the deliverables accepted reconcile. When a risk is closed, confirm it is actually closed, not just set aside.

**Be willing to change the dashboard.** If a metric is not informative, propose removing it. If something important is missing, propose adding it. The dashboard should evolve with the project's risk profile, not freeze on day one.

**Translate between dashboards.** The numbers on the executive view come from the data behind the project view. Ensure consistency; a divergence between layers is confusing and erodes trust faster than amber or red ever does.

**Do not hide behind the dashboard.** When a senior person asks a question the dashboard does not answer, do not point at the dashboard. Answer the question, and note to yourself whether the dashboard could be improved to cover that question next time.

## The honest dashboard

The best dashboards I have seen share a characteristic that is hard to name but easy to recognise. **They look slightly uncomfortable.** They show amber and red where amber and red belong. They show trending lines that are not always moving the right direction. They include one or two metrics that the project is not yet proud of.

This honesty is, paradoxically, what makes them trusted. **Readers who see a dashboard that reflects real variation and occasional bad news learn to believe the green when it appears.** Readers who see a dashboard that is always green learn, over time, to discount everything it says.

You cannot unilaterally make your project's dashboard honest — the PM and sponsor set the tone. But you can make sure that the data behind it is accurate, that the colours reflect your best judgment of reality, and that when you see a divergence between dashboard and truth, you raise it with the PM quickly. **Over time, the coordinators who insist on honest dashboards become the ones whose reports get trusted.**

## The reconciliation discipline

A subtle failure mode worth naming. When the executive dashboard and the project dashboard tell different stories — when the one-pager says GREEN but the workstream view shows two ambers — readers notice, and the dashboard loses authority faster than any single bad rating could cost it.

The cause is usually mechanical: the executive view is updated weekly, the project view daily, and the rolling-up logic doesn't reconcile cleanly. The fix is procedural. **Before any layer is published, the numbers across layers must square.** A milestone count on the executive view should equal the sum of workstream milestone counts on the project view. A workstream RAG that is AMBER on the project view cannot be inside a GREEN bundle on the executive view without an explicit rationale ("workstream amber but absorbed within programme buffer; no objective impact yet"). The rationale is itself useful — it tells the reader the divergence was deliberate, not sloppy.

As coordinator, the reconciliation check is yours. Five minutes before any executive dashboard publishes, walk the numbers against the underlying project view. Any divergence either gets resolved or gets a written rationale. **Divergence without rationale is the fastest way to lose dashboard credibility — faster than amber or red ever does.**

## Working with workstream leads on RAG

Most dashboard RAGs come from workstream leads, who report their own colour each week. Your job is to receive those reports, reconcile against operational evidence, and surface divergences to the PM.

A few practical notes.

**The "I can still recover" pattern.** A workstream lead who has been GREEN for nine weeks while the underlying signals deteriorate is usually emotionally committed to the recovery story. The colour reflects how she feels about it more than how the data reads. The chapter's framing applies: surfacing the divergence is your job; deciding what to do with it is the PM's.

**The conversation, not the spreadsheet.** When you notice a lead's RAG and your read of the workstream diverge, raise it in person before the dashboard refresh, not in a spreadsheet comment after. *"I've been looking at the burn-down and the open risks on Federation, and my read is amber-going-red. Can you walk me through what you're seeing that has it green?"* That's a learning conversation; a Slack comment correcting her colour is a confrontation.

**Bring it to your PM, not to the sponsor.** The dashboard's colours are the PM's call. When you believe a lead's colour is wrong and the lead disagrees, your move is to brief the PM and let her arbitrate. Going directly to the sponsor or steering with "the real colour" collapses the role distinction — and once collapsed, it doesn't easily come back.

## Audit, don't rewrite

When a PM hands you the dashboard and asks what you see, your job is to **audit it and propose specific changes** — not to redesign the whole thing and recommend the redesign goes to the sponsor on your call. The dashboard is the PM's artefact; the RAG is the PM's call; the executive view goes to the sponsor under the PM's name. Producing a v2 dashboard and offering to send it on the PM's behalf collapses three role boundaries at once. **Audit. Recommend. Let the PM decide and ship.**

## The "real status" question

A specific question worth practising. Sponsors, steering committees, and senior stakeholders will occasionally cut through the dashboard and ask, in plain terms, *"how is the project really doing?"* The question is a small test: do you have an answer that matches the dashboard, or do you have an answer that the dashboard would not have produced?

If your answer matches the dashboard exactly, either the dashboard is doing its job or you have stopped thinking independently of it. If your answer differs from the dashboard, you have just learned something useful — and the next step is a conversation with your PM about why. The chapter line: *coordinators who insist on honest dashboards become the ones whose reports get trusted.* The practice that gets you there is the small habit of answering the real-status question honestly, and noticing when your honest answer is different from what the dashboard says.

## Tomorrow, specifically

1. **Open your project's dashboard.** For each metric, ask: does this inform a decision I can imagine being made? If not, why is it there?
2. **Identify one metric you would propose removing** and one you would propose adding.
3. **Check the trending for two or three key metrics over the last twelve weeks.** Is the trend visible or obscured?
4. **Compare the executive view to the project view.** Do they tell the same story? If not, that divergence is corrosive.
5. **The next time someone asks you "how is the project really doing?"** — a question the dashboard should answer but often doesn't — note whether your answer matches the dashboard or differs. If it differs, that is a conversation for your PM.

That closes Part III. You have walked through the daily artefacts — requirements, WBS, schedule, meetings, minutes, status, RAID, change, dashboards — as craft, not as paperwork. Part IV is the judgment layer: the career-defining chapters about escalation, push-back, chasing, and political intelligence.
