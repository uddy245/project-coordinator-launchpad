# Lesson 7 — Scope, Schedule, Cost, Quality, Risk — And Why It's Not a Triangle
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 7; reading `docs/lessons/variables.md`
**Lesson slug:** variables
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1.

---

### COLD OPEN — The triangle that failed in slow motion (0:00–2:10)

*[Story slide. Direct address.]*

I want to tell you about a project where I watched the iron triangle fail in slow motion, because it taught me what actually happens when you pretend it works — and because the whole lesson is hiding inside it.

It was a loyalty platform for a retail group. Three brands, about nine hundred stores. Eight-million-dollar budget. A twelve-month deadline tied to a board commitment. I was the coordinator. The PM was a woman named Liv, whom I liked and respected, and who was operating inside constraints I don't, in retrospect, think any PM could have met.

The sponsor — the group's chief marketing officer — opened our kickoff by stating those constraints baldly. The launch date is non-negotiable. The budget is fixed. The scope is what we agreed. Those are the three corners of the triangle, he said, and they are all fixed. You have to make it work.

Liv pushed back, carefully. She said that in any project there has to be some flex somewhere — that if all three were truly fixed, the only way to absorb pressure would be through quality, and that quality problems on a customer-facing platform would cost the business more in the long run than any of the other three. The sponsor said he understood, he appreciated her diligence, and that it was our job to make it work anyway.

For four months, it looked like it might.

---

### WHEN REALITY ARRIVED (2:10–3:45)

*[Story slide.]*

Then reality arrived, in the form of three discoveries that weren't in the plan. The point-of-sale integration was more complex than discovery had suggested. A compliance review flagged a data residency problem that forced architectural changes. And the mobile team found that their planned authentication framework had licensing implications nobody had caught during vendor selection.

Each of these, on its own, was a legitimate project issue that should have produced a change request and a serious conversation about which constraint the sponsor was willing to flex. Instead — because the sponsor had pre-declared all three off-limits — the trade-offs were absorbed silently.

The integration work got done by cutting test scope for the non-core brands. The data residency rework got done on nights and weekends, without a change request, because filing one would have triggered a conversation the sponsor had ruled out. And the authentication problem got resolved by accepting a less-secure fallback pattern that the security lead flagged as a medium-term risk, but not a launch blocker.

We launched on time, in budget, with the stated scope. The sponsor was pleased. Someone wrote an internal case study about the successful delivery.

---

### THE BILL ARRIVES LATE (3:45–5:00)

*[Story slide.]*

In the six months after launch, the bill arrived. The authentication shortcut produced a security incident — not catastrophic, but enough to require an unscheduled remediation that cost about six hundred thousand dollars. The compressed testing had missed device-specific issues, so the mobile app's crash rate launched at four times the company threshold, and customer satisfaction for the first campaign came in meaningfully below projection. And the two non-core brand integrations required a follow-up project, funded separately, at about one-point-two million.

Add it all up. The true cost of that loyalty platform was about ten-point-two million dollars, not eight. And the true delivery date — if delivery means stably working as originally specified — was closer to eighteen months than twelve.

The sponsor had moved to another role by the time anyone tallied it. The case study about successful delivery was still on the company intranet.

Here's what that taught me. The iron triangle, as it's usually taught, isn't quite wrong — but it's taught in a way that encourages a specific kind of self-deception. Senior people use it to reassure themselves the project is under control, while one variable flexes quietly and the accounting is deferred. The real model isn't three variables. It's five.

---

### THE FIVE-VARIABLE MODEL (5:00–6:40)

*[List slide: the five variables.]*

So let me give you the real model. Five variables. Scope. Schedule. Cost. Quality. Risk.

Scope is what gets built, what the team will do, and — this matters — what's in the sponsor's head. Schedule is an estimate, not a promise. Cost: the cost you track is a subset of the cost you actually pay. Quality is the variable most often cut silently. And risk is the variable that moves all the others — it names what you don't yet know about how much the rest will really cost.

The classical triangle has three problems. First, it draws quality as a passive outcome floating in the middle. It is not passive. It's a real variable that gets actively, consciously cut to protect the others — on that loyalty platform, quality was what absorbed all the pressure. Second, the triangle doesn't represent risk at all, even though risk is what tells you which of the others is about to move. Third, it treats the variables as static. They aren't. They move continuously, and the trade-offs aren't a single decision at kickoff — they're a series of decisions all the way through.

None of these five can be fixed absolutely. You always have flex somewhere, whether you've named it or not. The only question is whether that flex is explicit and managed, or hidden and silent. Let me take each one in turn, because each gets misunderstood in a way that does specific damage.

---

### SCOPE IS THREE DIFFERENT THINGS (6:40–8:15)

*[List slide: product · project · sponsor's head.]*

Start with scope, because the word hides three different concepts that people conflate.

Product scope is what the thing being built actually does. Features, functions, specs. When someone says "the scope" in a design review, they usually mean this. Project scope is what the team will and won't do to deliver it — data migration, training, thirty days of post-launch support or none. When someone says "out of scope" in a stakeholder meeting, they mean this. And then there's scope in the sponsor's head — the bundle of unspoken expectations that almost never gets written down. The new system will lift my team's morale. This positions me for the promotion. The board will read this as proof of our transformation. When a sponsor says "this wasn't what we agreed," they usually mean the scope in their head.

These three drift apart. A team can deliver the product scope as specified, honor the project scope as documented, and still disappoint the sponsor — because the scope in their head was different. It's depressingly common.

So three habits. Pay attention to unstructured moments — the words a sponsor uses describing the project to peers, in the committee, in the corridor, are windows into their head. Take prototype feedback seriously even when it feels like new scope — if they say "but I thought it would also do X," don't reflexively say "out of scope." Say: X wasn't in the documented scope, but it sounds like it was in your expectations — let's decide whether to add it as a change or confirm it's out. And be skeptical of fast sign-off. A scope document signed off after twenty minutes of senior review reflects the PM's understanding, not the sponsor's. Sign-off is legal cover, not true alignment.

---

### SCHEDULE — PROMISE VERSUS ESTIMATE (8:15–9:35)

*[List slide: the four schedule failure modes.]*

The schedule is the variable most often treated as a promise when it's actually an estimate. A promise is a commitment with consequences. An estimate is a forecast based on current information, with a range of uncertainty. Very different statements — and they should produce very different responses.

New coordinators confuse these constantly. They treat the plan as a promise, get anxious when reality diverges, and avoid updating the schedule because updating it feels like admitting failure. But divergence is a normal property of estimates, and refusing to update means you're operating on outdated information.

Four failure modes show up again and again. Compression — the plan is built backward from a date the sponsor wants, achievable only under ideal conditions that rarely hold; when it slips, the slip gets treated as a performance problem instead of a schedule that was never real. Missing dependencies — the work shows up in the plan, but the external parties, shared resources, and pending decisions don't; a schedule that doesn't model its own dependencies will lie to you. No critical path — hundreds of line items, and nobody's worked out which sequence actually drives the end date, so effort gets allocated by default instead of by strategy. And zombie scheduling — the plan exists but isn't used; day-to-day work runs on inbox urgency. A dead schedule is worse than no schedule, because it gives false comfort that the project is being managed.

---

### COST — TRACKED VERSUS TRUE (9:35–10:50)

*[Statement slide, then example card.]*

Cost looks the most concrete of the five, because money is quantifiable. It's also where the true cost diverges most from the tracked cost.

The tracked cost is what shows up in the budget tracker — labor, vendor fees, software, hardware, direct expenses. The true cost includes all of that, plus the things nobody tracks. The opportunity cost of internal people not doing other work. The productivity dip during change adoption. Post-launch defect remediation. The follow-up project for deferred scope. Interest on technical debt. The hours senior people spend in governance and committees that never get charged anywhere.

A well-run project is honest about all of that at closeout. A less well-run one reports the tracked cost as the project cost, and leaves the sponsor with an inflated sense of how efficient it was.

For you, three implications. When you track budget-to-actuals, remember actuals are a subset of true cost. When cost pressure arrives, be specific about which costs are being cut — letting people go early, renegotiating licenses, and deferring scope have very different downstream consequences. And watch for costs absorbed informally. A team working weekends without overtime is a real cost — in morale, in attrition risk, in lower productivity the week after. It doesn't show up in the tracker. It shows up eventually.

---

### QUALITY — THE SILENT CUT (10:50–12:15)

*[List slide: the six dimensions of quality.]*

Quality is the variable most often cut silently, and the one most likely to cost more than its own weight later.

Quality isn't "how good the thing is." It's the degree to which the delivered product meets the needs it was meant to meet, performs reliably under the conditions it will actually face, and provides a foundation for ongoing use without creating excessive future liability. It breaks into six dimensions. Functional — does it do what it's supposed to? Performance — under load, at speed, with reliability? Usability — can the people who'll use it actually use it? Maintainability — can someone who didn't build it operate it? Security — is it protected against reasonable threats? And compliance — does it meet the regulatory and policy requirements of its environment? A good project names the bar for each. A struggling one doesn't, and the bar gets set by default.

The trap is that quality cuts almost never happen consciously. They happen by pressure. Schedule slips, so we "finish quickly," so we cut testing — and we get post-launch defects. Scope is added without budget, so we cut code review — and we get technical debt. Cost comes down, the team shrinks, documentation gets cut — and knowledge walks out the door when someone leaves. These cuts are invisible at the time and visible later, often paid by a different budget, which is exactly why they never show up on the project's closeout.

Your job is to keep quality visible. When testing gets reduced under pressure, name it in the status narrative as a risk: test coverage for non-core flows reduced to sixty percent from a planned eighty-five — this creates a risk of post-launch defects in those flows. That one sentence turns a silent cut into a named risk that people can actually discuss.

---

### RISK — THE VARIABLE THAT MOVES THE OTHERS (12:15–13:15)

*[Example slide: the absorption table.]*

Risk is the fifth variable, and the most important, because it's the one that tells you which of the other four is most likely to move. Risk isn't a static list of bad things. It's the representation of what you don't yet know about how much the other four will actually cost.

Every plan rests on assumptions. Risks are the assumptions you know might not hold. When a risk materializes, it becomes an issue — and the issue has to be absorbed somewhere, through one of the other four. Vendor capacity slips, and the schedule absorbs it. Scope ambiguity surfaces a new requirement, and cost absorbs it through a change request, or scope absorbs it by swapping something out. Technical complexity forces a change of approach, and cost and schedule absorb it — and sometimes quality.

Most RAID logs list risks with impact and likelihood ratings and no link to which variable is actually threatened. Here's an improvement worth making even if your template doesn't require it: for each risk, name the variable it threatens and the absorption strategy. Risk — vendor capacity. If it materializes, schedule absorbs unless scope is reduced or an alternate vendor is engaged. Mitigation — weekly check-ins, fallback vendor identified. That turns the register from a list into an operational tool. And watch two things: is the risk register growing faster than it's shrinking — uncertainty is rising — and has the flex in any variable been used up, because then the next bad event has nowhere to go.

---

### WHAT YOU'RE GOING TO DO (13:15–14:20)

*[Slide: workbook brief + close.]*

Here's your work for this lesson. In the workbook, you'll take your current project and write down, honestly, what flex each of the five variables actually has — a private assessment, just for you, that sharpens your sense of the project's real posture. Then you'll go to your RAID log and, for each risk, name which of the five variables it threatens. If that's not obvious, rewrite one or two with the affected variable spelled out.

*[Back on camera, slower.]*

The reason I started with that loyalty platform is that it's the whole lesson in miniature. The sponsor fixed three corners and declared the triangle solved. But you can't fix all of them — so one variable flexed silently, and it was quality, and the bill arrived eighteen months and two million dollars later, addressed to someone who'd already moved on. You are not the decider on these trade-offs. The PM and the sponsor are. But you are, very often, the person who makes the trade-off visible before it gets absorbed in the dark. When something has to give, ask out loud: which variable is giving, and why is that the right choice? That question, asked early and quietly, is some of the most valuable work this role contains.

See you in the workbook.

---

*[End card: Lesson 7, Scope, Schedule, Cost, Quality, Risk. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slides for the three-part cold open (the triangle, reality arriving, the late bill) and the close; list slides for the five variables, three kinds of scope, four schedule failure modes, and six quality dimensions; example slides for the cost picture and the risk-absorption table.

**Integrity:** The loyalty-platform story, the PM "Liv," and the cost tally are drawn from the instructor's handbook (Ch 7), narrated in first person. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 1 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
