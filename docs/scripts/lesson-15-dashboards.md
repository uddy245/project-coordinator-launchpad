# Lesson 15 — Dashboards and the Uncomfortable Truth of a Project
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 16; reading `docs/lessons/dashboards.md`
**Lesson slug:** dashboards
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1.

---

### COLD OPEN — The dashboard that won an award (0:00–1:55)

*[Story slide. Direct address.]*

I want to start with a dashboard that won an internal award. I was on the programme. Eleven visualisations, four colours, updated daily, available on a shared portal that anyone could open. Senior leaders praised it. The programme's management cited it as evidence of rigorous governance. People genuinely admired the thing.

It was useless. And I want to explain to you exactly why, because the reason is the whole lesson.

It showed percentages of milestones completed, hours burned, risk counts, defect counts, and a dozen other metrics. Every single metric was technically accurate. Nobody was lying. What it did not show — what it could not show — was whether the programme was actually going to succeed.

Six months later, the programme hit the wall. And here's the part I think about: when it did, the dashboard still showed ninety percent green on most metrics. The people running it were genuinely shocked. The people below them, the ones who knew the real story, were not shocked at all.

So let me show you how a dashboard full of accurate numbers can tell a comfortable lie — and then I'll show you how to build one that tells the truth.

---

### FOUR ACCURATE NUMBERS, ONE FALSE STORY (1:55–3:50)

*[List slide: Milestones · Hours · Risks · Defects]*

Walk through the four numbers with me, because each one looks reassuring and each one is hiding something.

Milestones completed showed about ninety percent at any given time. Sounds healthy. But the milestones were defined broadly enough that you could slip a hard one — integration go-live, the thing the whole programme depended on — and hit ten easy ones, every individual workshop, and still come out at ninety-some-percent. The hard milestone and the trivial milestone counted exactly the same.

Hours burned against budget were tracking close to plan. Also reassuring. Except the hours being burned were not the hours the plan assumed. The team was spending disproportionate time on rework, and rework was recorded the same way as fresh, greenfield work. The number was right. The meaning was inverted.

Risk counts sat at about twenty open risks, roughly stable. But the composition had shifted underneath the total. The risks that had been closed were mostly the easy ones. The ones that remained were concentrated on the critical path. A stable count was hiding a deteriorating profile.

And defect counts were trending downward — which sounds like exactly what you want, until you realise the trend reflected testing slowing down, not defects being fixed. Fewer tests run, fewer defects found. The line went the right way for the wrong reason.

Four accurate numbers. One false story. That's the thing to understand: a dashboard is not neutral. A dashboard is a choice about what matters, and every choice excludes something. Done well, it's a compact way to see a project's real state. Done poorly, it is expensive flattery.

---

### THE FOUR QUESTIONS A DASHBOARD MUST ANSWER (3:50–5:35)

*[List slide: On track? · Where's the pressure? · What changed? · Where should senior attention go?]*

So what should a dashboard do instead? At minimum, a project dashboard should answer four questions at a glance.

One. Are we on track to meet our objectives? Not "are tasks getting ticked off" — some measurable indicator of progress against the actual outcome. The award-winning dashboard answered task completion beautifully and the objective question not at all.

Two. Where is the pressure? Which workstreams, which areas, are at highest risk right now. Not "there are twenty open risks" — that's a number, not a signal. "These three risks are currently the most consequential." That's where someone can act.

Three. What has changed since last time? Trending, not just a snapshot. A red indicator that has been red for weeks is a completely different animal from one that just turned red this week. A snapshot can't tell you which you're looking at.

Four. What does senior attention need to be on? The three or four things where someone senior could usefully act. If your sponsor reads the dashboard and doesn't know what to do with it, you've given them decoration.

That's the test. If your dashboard cannot answer these four questions, it is decoration. Pretty, accurate, daily-updated decoration.

---

### THE METRICS THAT ACTUALLY SIGNAL (5:35–7:50)

*[List slide: Outcomes · Leading · Composition · Trend · Subtract]*

Not every metric is worth tracking. Here are the principles that separate signal from noise.

Track outcomes, not just activity. Hours burned is an activity metric; features accepted by the product owner is an outcome metric. Meetings held is activity; decisions made is outcome. Activity metrics tell you whether people are busy. Outcome metrics tell you whether the project is producing value. Those are not the same question, and busy is the easier one to look good on.

Track leading indicators where you can. A defect count is a lagging indicator — it tells you about quality after testing has already found the problems. A code-review coverage metric is a leading indicator — it tells you about quality practices before problems surface. Leading indicators give you warning. Lagging indicators give you history. You want both, but the warning is what saves you.

Track composition, not just totals. As in my opening story — "twenty open risks" is far less useful than "three critical-path risks, five medium, twelve low." The composition is where the signal lives. The total is where it goes to hide.

Track trend, not just point values. A metric with no historical comparison literally cannot be interpreted. Is eighty-seven percent good or bad? You have no idea. It depends entirely on whether it was ninety-two last week or eighty-one.

And here's the one nobody does: drop metrics that nobody uses. If a metric has been on the dashboard for three months and nobody has ever asked about it or acted on it, it is noise. Remove it. Dashboards accumulate metrics and never subtract them, and they slowly clutter up with things that once seemed useful. A good dashboard is curated, not collected.

---

### RAG, AND THE LIE OF TWELVE WEEKS OF GREEN (7:50–9:15)

*[Statement slide: "Twelve weeks of green is a lie by omission"]*

A word on R-A-G ratings — red, amber, green — at the dashboard level. Same disciplines as the status report. A dashboard full of green cells for twelve weeks straight is reporting a lie by omission. The test is simple: do the ratings ever actually change? If they don't, they aren't measuring anything.

One specific pattern to watch. Some organisations use colour-by-threshold — the metric hits a defined threshold, the colour changes automatically. That's useful, but it can be gamed, because the thresholds quietly drift to wherever the current number happens to be. The complement is P-M judgment override — the P-M can set a colour based on context, with a written rationale attached.

Here's the thing most people get wrong: it's not threshold versus judgment. It's both. Both mechanisms together produce a more honest dashboard than either one alone. The threshold catches the obvious drift that a busy human misses. The judgment catches the situation the metric can't see. You need the machine and the person.

---

### ONE VIEW CAN'T SERVE THREE AUDIENCES (9:15–10:45)

*[Example slide: misleading single view vs three honest layers]*

Like status reports, dashboards have to be tailored to who's reading them — and most dashboard failures come from trying to serve three audiences with one view.

The team dashboard is operational. Velocity, burndown, defect rates, build status, the action tracker. It's full-screen, updated daily or near-real-time, and the team uses it to actually run the work.

The project dashboard is tactical. Milestone progress, workstream R-A-Gs, budget-to-actuals, top risks, the upcoming decisions. One screen, updated weekly, owned by the P-M and the coordinator.

The executive dashboard is strategic. Overall health, objective progress, top three risks, the sponsor decisions that are needed. One page, updated weekly or biweekly, and it goes into the steering pack.

The team dashboard is far too detailed for the sponsor — they'll drown. The executive dashboard is far too thin for the team — they can't run anything off it. When you mash them into one view, you fail everyone simultaneously. Build the layer each audience actually needs.

---

### THE COORDINATOR'S ROLE (10:45–12:25)

*[List slide: Verify · Change · Translate · Don't hide]*

Now — you are very often the person who maintains this dashboard day to day. So here are the practices that matter most for you specifically.

Verify what you publish. When a workstream lead reports eighty percent complete, check whether the burn-up and the deliverables actually accepted reconcile with that number. When a risk is marked closed, confirm it's actually closed — not just quietly set aside. You are the last accuracy check before that number becomes a senior person's belief.

Be willing to change the dashboard. If a metric isn't informative, propose removing it. If something important is missing, propose adding it. The dashboard should evolve with the project's risk profile, not freeze on day one and calcify there.

Translate between dashboards. The numbers on the executive view come from the data behind the project view. They have to square. A divergence between layers is confusing, and it erodes trust faster than amber or red ever could. A milestone count on the executive view should equal the sum of the workstream counts on the project view. Five minutes before any executive view publishes, walk the numbers against the layer underneath it. Any divergence either gets resolved, or it gets a written rationale — "workstream amber but absorbed within programme buffer, no objective impact yet." That rationale tells the reader the divergence was deliberate, not sloppy. Divergence without a rationale is the single fastest way to lose dashboard credibility.

And don't hide behind the dashboard. When a senior person asks a question the dashboard doesn't answer, do not point at the dashboard. Answer the question. Then quietly note to yourself whether the dashboard could be improved to cover that question next time.

---

### THE HONEST DASHBOARD (12:25–13:35)

*[Story slide]*

The best dashboards I have ever seen share a quality that's hard to name but easy to recognise. They look slightly uncomfortable. They show amber and red where amber and red belong. They show trending lines that aren't always moving the right direction. They include one or two metrics the project is not yet proud of.

And that discomfort is, paradoxically, exactly what makes them trusted. Readers who see a dashboard that reflects real variation and the occasional bit of bad news learn to believe the green when it appears. Readers who see a dashboard that is always green learn, over time, to discount everything it says — including the parts that are true.

You can't unilaterally make your project's dashboard honest. The P-M and the sponsor set the tone. But you can make sure the data behind it is accurate, that the colours reflect your genuine best read of reality, and that when you see daylight between the dashboard and the truth, you raise it with the P-M quickly. Over time — and this is the line I want you to keep — the coordinators who insist on honest dashboards become the ones whose reports get trusted.

---

### WHAT YOU'RE GOING TO DO (13:35–14:25)

*[Slide: workbook brief + close]*

Here's your work for this lesson. Open your project's dashboard. For each metric, ask one question: does this inform a decision I can imagine being made? If not, why is it there? Then identify one metric you'd propose removing and one you'd propose adding. Check the trending on two or three key metrics over the last twelve weeks — is the trend visible, or is it buried? And compare the executive view to the project view: do they tell the same story?

*[Back on camera, slower]*

I started with a dashboard that won an award and then walked a programme straight off a cliff while glowing green. The numbers on it were all accurate. That's the trap. Accuracy is not honesty. A dashboard can be true in every cell and false as a whole. So the next time a sponsor cuts through all of it and just asks you, plainly, "how is the project really doing?" — notice whether your honest answer matches the dashboard, or differs from it. If it differs, you've just learned something. And that is a conversation for your P-M.

See you in the workbook.

---

*[End card: Lesson 15, Dashboards and the Uncomfortable Truth of a Project. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slides for the cold open, the honest dashboard, and the close; list slides for the four numbers, the four questions, the metric principles, and the coordinator practices; a statement slide for twelve-weeks-of-green; an example slide contrasting a misleading single view with three honest layers.

**Integrity:** The award-winning dashboard story and the four-metrics breakdown are drawn from the instructor's handbook (Ch 16), where the author narrates "a program I was on in the mid-2010s" in first person. Narrated here in first person on that basis. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 1 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
