# Lesson 9 — The Work Breakdown Structure: How to Actually Build One
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 9; reading `docs/lessons/wbs.md`
**Lesson slug:** wbs
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1 and Lesson 20.

---

### COLD OPEN — The WBS nobody believed (0:00–2:10)

*[Story slide. Direct address.]*

My first real work breakdown structure — the first one I was asked to help *build*, not just maintain — was for a branch rationalization program at a regional bank. The PM was a man named Tom. Calm, thorough, the kind of person who never seemed rushed. And he made a call early that I thought was a waste of everyone's time.

He decided we'd build the WBS in a two-day workshop with the core team. Eight people, two days, in a room. Rather than what I'd seen every other PM do, which was draft the thing themselves over a weekend and send it out for review.

I was skeptical, and I'll be honest with you about why. I had watched PMs build WBSs alone before. It was faster. The output looked the same. I did not understand why we'd burn two days of eight people's time on something Tom could clearly produce by himself in an afternoon.

Then the workshop happened.

On the first morning, a developer noticed that a workstream Tom had assumed was a single package was actually two. The front-end rebuild and the back-end integration had different teams, different risks, and different durations. Treating them as one line item would have produced a schedule that hid the real dependency — the kind of hidden dependency that surfaces three months later as a crisis.

On the second morning, the change management lead pointed out that Tom's decomposition had no package at all for end-user communication. Which she described, dryly, as "half my job for the next four months."

By the end of the two days, the WBS had seventeen more leaves than Tom had sketched alone. And four items had been consolidated or dropped.

The new WBS was better. But that wasn't the real lesson. The real lesson was this: the eight people who built it believed it. When execution started, I never once heard anyone say "that's not really what I signed up for." Because they *had* signed up for it. They had written it.

---

### THE MODEL IS THE POINT (2:10–3:20)

*[Statement slide]*

That workshop taught me what a WBS is actually for, and I want to give it to you before any of the mechanics, because if you get this backward, the mechanics won't save you.

A WBS is not a diagram. It is a shared model of the work, built by the people who will do it, with the artifact as evidence that they agreed. The diagram is the residue. The model is the point.

So this lesson covers the WBS as both. I'll teach you the mechanics — the hundred-percent rule, the decomposition principles, how to structure it. And I'll teach you the process, which is where most of the value actually lives, and which is also where you, as the coordinator, have a specific job to do.

Let's start with what the thing even is.

---

### WHAT IT IS, AND WHAT IT ISN'T (3:20–5:00)

*[Def slide, then a bad/good example]*

The work breakdown structure is a hierarchical decomposition of the total work required to complete the project. It's organized from the project outcome at the top, down to individual work packages at the bottom. Each level breaks the level above it into its parts. The lowest level — the leaves — are work packages small enough to estimate, schedule, and assign.

Now, two things a WBS is *not*, because confusing them causes real damage.

It is not a task list. A task list is a flat enumeration of things to do. A WBS is a *structured* decomposition — it answers "what does this project consist of?" at multiple levels of detail. A senior stakeholder reading the top two levels should understand the shape of the whole project. A delivery team member reading the bottom two levels should understand their specific work. One artifact, serving both, because of the structure.

And it is not a schedule. A schedule adds dates, durations, dependencies, and resources. The WBS is the *what*. The schedule is the *when*. You build the WBS first, and you derive the schedule from it. A WBS without a schedule is incomplete as a plan but still genuinely useful as a scope agreement. A schedule without a WBS underneath it is almost always a schedule built on invisible assumptions.

---

### THE 100% RULE (5:00–7:00)

*[Statement, then a list of the forgotten categories]*

Here's the core discipline, and it's the one thing from this lesson I'd tattoo on a new coordinator if I could. The hundred-percent rule: the work captured at any level must represent a hundred percent of the work needed at that level. No more, no less.

*No more* means you don't include work outside the project's scope. If the WBS has packages for things the project will never deliver, the project gets confused about its own boundaries.

*No less* — and this is where most WBSs fail — means you don't omit work that *is* inside scope. There's a list of usual suspects, the categories that go missing again and again. Project management overhead: status reporting, governance, steering prep. Change management: stakeholder engagement, communications, adoption. Training. Documentation. Transition to operations. The hypercare period after go-live, when the project still owns the issues. And closure — lessons learned, financial closeout, archival.

When these are missing from the WBS, here's what actually happens: the work happens anyway. Someone does it. But the effort was never planned, the cost was never budgeted, and the schedule never accounted for it. The project gets called "delivered" while pieces of it are quietly being absorbed by people who never agreed to absorb them.

So here's the practical test. Look at a WBS and ask: *if this is a hundred percent of the work, and the team does exactly what's listed — will the project be complete?* Walk it from kickoff to closure in your head. Do kickoff activities appear? Do the weekly status reports have a home? Does user training appear? Does transition to operations have packages? Does closure? If any of those are missing, the WBS does not meet the rule.

And catching those omissions is often *your* job. You are attuned, from your own daily experience, to exactly the categories that get forgotten — the administrative, the coordinative, the transitional work that's so easy for a technical team to overlook when they're heads-down on the build. The leads will not name the PMO overhead. You will.

---

### DECOMPOSITION — HOW FAR DO YOU GO? (7:00–9:30)

*[List slide: the four principles]*

So how do you decide what to break down, and how far?

A work package should be small enough to estimate with reasonable accuracy, assign to a single owner, and track as a unit. The common rule of thumb is the eight-eighty rule: a package should be between eight and eighty person-hours of work. Smaller than eight, and the decomposition's probably too fine — you're turning tasks into rituals. Larger than eighty, and the package hides too much variability. You cannot accurately estimate a hundred-and-fifty-hour block, because you don't yet know what's inside it.

Four principles worth carrying with you.

First — decompose by deliverable, not by activity. Organize the WBS around the things the project will *produce*, not the actions the team will *take*. "Build integration" is a deliverable. "Meet with the vendor, write specifications, review drafts" — those are activities. Activities belong in the schedule. Deliverables belong in the WBS. It sounds like a small distinction, but watch what happens when you get it wrong: an activity-oriented WBS produces a status report that says "seventy percent of activities done," and nobody in the room can tell you whether the deliverable is actually usable.

Second — decompose to a consistent level. If one branch is broken down five levels deep and another only two, the project is quietly saying it understands one area far better than the other. Sometimes that's legitimate. But it should be a deliberate choice, not an accident. Uneven decomposition is usually a tell — and the underdeveloped branch is exactly where the surprises will surface.

Third — decompose by who will do the work. If two packages would be done by completely different teams, with different skills and different timelines, split them. If two would be done by the same team as one continuous flow, they may be combinable. The WBS should make assignment easy, not difficult.

And fourth — stop decomposing when going further wouldn't help you plan. If a package is small enough to estimate and assign, stop. You are not trying to describe every hour of the project. You're trying to describe it at a level that supports planning and tracking. Knowing when to stop is its own discipline.

---

### BUILDING IT IN THE ROOM (9:30–11:30)

*[List slide: the coordinator's three jobs]*

Now back to the workshop, because the *how* matters as much as the rules.

The best WBSs are built by the people who'll do the work, facilitated by the PM, and very often supported by you. The classical format: six to twelve people in a room — PM, coordinator, workstream leads, key subject-matter experts. One or two days, depending on the size of the project. You open with the project outcome, a single concrete statement of what the project will produce. That's the top of the tree. Then the team works down, level by level — major components, then deliverables, then packages.

The facilitator keeps the conversation on *what* the project will produce, not yet *how* it'll be done. The team drifts into schedule and resourcing constantly; the facilitator keeps pulling it back. Post-its on a wall, sticky-note software, a hierarchical list on a shared screen — any of them work for capture.

And here's your part. In that room, you have three specific jobs.

One: keep the WBS captured accurately and visibly as it emerges. People need to *see* their contribution land on the wall. That visibility is half of why they'll believe it later.

Two: surface the categories of work that tend to get forgotten — the administrative, the coordinative, the transitional. This is your signature contribution. The technical leads will not raise PMO overhead, or the closure work, or the handover to operations. You will. That's the value you specifically bring into that room.

Three: track the decisions and dependencies that come up in the conversation. Many of them won't belong in the WBS at all — they'll feed the schedule, the risk register, the stakeholder plan. But if you don't catch them as they fly past, they're gone.

After the workshop, you usually do the cleanup — rationalizing the structure, standardizing the language, numbering the items, producing a clean version for review. And the final WBS goes *back* to the team for confirmation before anyone baselines it.

---

### WHEN THE ROOM ISN'T POSSIBLE (11:30–12:30)

*[Statement slide]*

Now, real life. Sometimes the calendar or the budget will not give you two days. So here's the ladder of options.

The middle option is a structured half-day walkthrough with just the workstream leads — three hours, not two days. Same facilitation discipline, same three coordinator jobs, narrower participation. The fallback below that is per-workstream walkthroughs, forty-five minutes each. That one's worse, because you lose the cross-workstream dependency capture — the exact thing that saved Tom's project on day one. But it still preserves the one thing that matters most: the doers contributed.

And here's the thing *not* to do. Do not let someone baseline a solo-authored WBS and then call the team review a "courtesy." The doers' contribution isn't a nicety you bolt on at the end. It *is* the value. Skip it and you've skipped the entire point of the exercise.

---

### WHY THE STAKES ARE HIGH (12:30–13:20)

*[List slide: what the WBS feeds]*

One more reason to get this right. The WBS is the hub of the whole plan, and almost everything flows out of it. The schedule takes each package and adds timing. The budget rolls up cost, package by package. The responsibility matrix assigns one accountable owner to each. The risk register gets built by walking the leaves and asking "what could go wrong here?" And the reporting structure mirrors the tree — status rolls up from the packages to the workstreams.

Which means errors propagate. A missing package becomes missing schedule, missing budget, and missing status tracking, all at once. A leaf framed as an activity instead of a deliverable becomes a schedule line that reads "in progress" forever, because nobody can answer "is it done?" The hundred-percent rule matters because catching an omission at build time costs you hours. Catching it later costs you months.

---

### WHAT YOU'RE GOING TO DO (13:20–14:25)

*[Slide: workbook brief + close]*

So here's your work for this lesson. Find your project's WBS. If it exists, read it, and walk it against the omission list — are there whole categories of work missing? Check whether your status reporting and RAID entries actually trace back to WBS items; if they don't, the WBS has drifted from real use. And if a WBS is still being built on your project, volunteer to help run the workshop. If it's later, volunteer for the refresh.

*[Back on camera, slower]*

I started with Tom's workshop because that two days I resented turned out to be the most important planning I ever watched. The artifact we walked out with was good. But the artifact was the residue. The real product was eight people who believed in the plan because they'd written it.

That's the whole craft of a WBS in one sentence. Anyone can draw the tree. The work — the thing you're actually there for — is building the shared belief that the tree is true. Spend your career on that side of it.

See you in the workbook.

---

*[End card: Lesson 9, The Work Breakdown Structure. Next up: schedules, dependencies, and the critical path.]*

---

### Production notes

**Cuts:** Story slides for the cold open and the close; statement slides for "the model is the point," the 100% rule framing, the when-the-room-isn't-possible caution, and the stakes; a def slide for what a WBS is; a bad/good example for task-list-versus-WBS and activity-versus-deliverable; list slides for the forgotten categories, the four decomposition principles, the coordinator's three jobs, and what the WBS feeds.

**Integrity:** The cold-open workshop story (Tom, the regional bank, the seventeen extra leaves) is drawn from the instructor's handbook (Ch 9), narrated in first person exactly as written there. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 20 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
