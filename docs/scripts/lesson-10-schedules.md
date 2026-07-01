# Lesson 10 — Schedules, Dependencies, and the Critical Path
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 10; reading `docs/lessons/schedules.md`
**Lesson slug:** schedules
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1 and Lesson 20.

---

### COLD OPEN — The schedule that lied every Friday (0:00–2:10)

*[Story slide. Direct address.]*

I want to start with a schedule that lied to me. Not dramatically. Politely. Every Friday, for six weeks.

This was a regulatory project, my seventh year in the work. I inherited a schedule that showed us ninety-four percent complete at the end of month three. And every Friday I did what a diligent coordinator does — I updated the percentages, produced a clean burndown chart, and sent it to the PM and the sponsor. Every Friday the picture was rosy. Every Friday, people nodded.

Then in week seven, a technical lead asked me, almost in passing, whether we still expected to start user acceptance testing on the first of the next month. I said yes — because the schedule said yes. He told me he was surprised. His team hadn't finished the integration work that UAT depended on, and they weren't, in his judgment, within a week of finishing it. They were within three.

So I went back and walked the tasks. The integration work showed eighty-eight percent complete. And underneath, the low-level line items were full of completion estimates entered by a team lead who'd been rounding up for weeks to avoid raising alarms. The aggregate was a rollup of soft numbers. And the soft numbers reflected people's hopes, not their progress.

UAT slipped three weeks. The sponsor was furious — not at the slip, but at the surprise. He looked at me and said, "I have been looking at green for seven weeks. What changed?" And the honest answer was: nothing changed. The green had never been true. It was the rollup of a hundred small optimisms.

That project taught me the sentence this whole lesson is built on. A schedule is not a file you update. A schedule is a model of reality that you continuously verify. If the verification is shallow — if you take what people tell you and don't cross-check it — the schedule becomes a polite fiction. This lesson is about how to keep it honest.

---

### WHAT A SCHEDULE ACTUALLY DOES (2:10–3:40)

*[Slide: "a schedule is a model of reality, not a file"]*

Let's get the foundation right, because most people manage the wrong thing.

A schedule translates the work breakdown into time. For each work package it answers five questions. When will this start? When will it finish? What must happen before it can start? What is waiting on it to finish? And who is doing it? Put all those answers together, across every package, and you have the project's timeline.

Now here's the test. A good schedule answers four questions at any moment, on any day you ask it. What is the current end date of the project? What is the critical path — the chain of dependent work that determines that end date? What is at risk of slipping? And what, if it slipped, would push the end date out?

A schedule that cannot answer those four questions is not doing its job — no matter how many bars are on its Gantt chart. Hold onto those four questions. Everything else in this lesson is in service of being able to answer them honestly.

---

### DEPENDENCIES — THE KINDS THAT MATTER (3:40–6:00)

*[List slide: Internal · External · Resource · Decision]*

A dependency is just a relationship where one work item can't start, or can't finish, until another has reached a certain state. There are four textbook types — finish-to-start, start-to-start, finish-to-finish, start-to-finish — and in practice the first one dominates. Most dependencies are simply "B can't start until A finishes." You don't need to memorize the taxonomy.

What you do need is a different distinction — not the type, but the source. Because that's where slippage actually comes from. There are four categories.

Internal dependencies live inside the project. Design must be approved before development starts. Testing can't begin until the build is delivered. These are the easiest to manage, because both parties are on your team.

External dependencies are on parties outside the project. A vendor has to deliver a component. A third-party system has to be made available. A regulatory approval has to come through. Harder — because you don't control the other side, and your schedule's accuracy depends on information you can't verify yourself.

Resource dependencies are on people or assets shared with other projects. The one architect you need for a week is booked elsewhere. The test environment is shared and queued. These are dangerous precisely because they're invisible in a schedule that tracks task flow but not resource availability.

And decision dependencies are on choices nobody's made yet. Procurement hasn't picked the vendor. The architecture team hasn't settled the integration pattern. These slip because schedules quietly assume the decision will happen "on time," with no actual plan for making that true.

Here's your job with all of this. Part of it is mechanical — capturing dependencies in the schedule. But the real value is investigative. You surface the dependencies the team hasn't named — especially the external, resource, and decision ones. A schedule that shows only internal task-to-task links is a schedule whose slippage will arrive from a direction it never predicted.

---

### THE CRITICAL PATH (6:00–8:20)

*[Slide: "every project has a critical path; not every project knows what it is"]*

Now the single most important concept in scheduling. The critical path.

The critical path is the sequence of dependent activities that determines the project's end date. The rule is simple and unforgiving. Any slip on a critical-path activity slips the whole project. Slips on activities off the critical path just get absorbed into slack — they slip, but the end date doesn't move, as long as they don't slip so far that they themselves become critical.

Here's the line I want you to remember. Every project has a critical path. Not every project knows what it is. That gap is one of the most common, and most consequential, failures in all of schedule management.

Finding it is simple in principle. You walk the schedule backward from the end date, following the longest chain of dependent activities. Most tools will highlight it for you automatically. But — and this is the part people miss — the critical path shifts as the project moves. Activities that had slack become critical when earlier activities slip. The critical path you have in month one is often not the critical path you have in month four. So your discipline is to always know the current critical path, and to point your attention there.

Which means slippages are not all equally urgent — and treating them as if they are is a classic mistake. A critical-path activity going amber is a project-level risk. A non-critical activity going amber may still be perfectly serviceable inside its slack. A one-week slip on a critical activity can push the project out by a week. A three-week slip off the path can push it out by zero — it just eats slack. Teams that can't tell these apart waste their panic on one and miss the severity of the other.

---

### FLOAT, SLACK, AND BUFFER (8:20–9:50)

*[Def slide: Float/slack vs Buffer]*

Three related words, often confused, worth getting precise about. Float — also called slack — is how much a non-critical activity can slip without moving the end date. Buffer is intentional contingency you build into the schedule on purpose, to absorb variability you know is coming but can't yet locate.

Here's the mature practice. You don't pad every activity. Padding everything produces a schedule that's uniformly inflated and uniformly optimistic at the same time — because teams unconsciously consume their own task-level padding. Far better is a small number of named buffer reserves, held at specific points by the PM. Before a major milestone. Before an integration. Before an external dependency lands.

And your job as coordinator is to track buffer consumption. If you started with two weeks of buffer before the integration milestone, and you've burned one week in the first third of execution, the PM needs to hear that. Because burning buffer faster than you're burning work is one of the cleanest early warnings you'll ever get that the estimates were optimistic. Watch that ratio.

---

### KEEPING THE SCHEDULE HONEST (9:50–12:00)

*[List slide: Evidence not assertion · Binary status · Cross-check actuals · Walk the path · No silent re-planning]*

So back to the schedule that lied. Percentages rolling up from soft inputs — that is the single most common way schedules deceive. The defenses are specific, and they're all things you can do.

First: verify against evidence, not assertion. When a lead tells you a package is eighty percent complete, ask what the eighty is based on. "We're tracking well" is an assertion. "Eight of the ten sub-tasks are done, and the last two have about four days left" is evidence. Treat those two answers completely differently.

Second: use binary or coarse completion for small packages. Don't track percent complete on a two-week task — that number is noise. Track not started, in progress, done. Less work, more accurate.

Third — and this is the most powerful single check you have — cross-check with actuals. If a package was estimated at eighty hours and the team's logged forty, the remaining work is probably about forty, and you're finishing on estimate. But if they've logged sixty hours and they're reporting fifty percent complete, something is wrong. Either the estimate was low, the report is optimistic, or hours are being miscategorized. The hours-versus-completion ratio is one of the most reliable signals you will ever have. That ninety-four-percent failure I opened with would have been visible in week three if anyone had simply asked: the team has burned eighty percent of the hours and the work is reported at ninety-four — where's the gap?

And here's the part that matters most. That cross-check is also a kindness. Leads round up because the alternative is delivering bad news every Friday. When you ask "what evidence supports the eighty?", you give them a structured, face-saving place to surface the truth. "The estimate was light by thirty percent" is a far easier sentence to say than "I've been overstating progress for a month." Asking the first question lets them get to the second.

Fourth: walk the critical path weekly. Once a week, trace the current critical path end to end, and for each activity get a real status update — ideally from the person doing the work, not just the lead reporting on it. Twenty minutes. It catches problems faster than any dashboard ever built.

And fifth: push back on silent re-planning. When someone says "we're tracking well" after a date has actually already slipped, the schedule needs to be updated, not reassured. Help your PM insist on that. Schedules that get updated reflect reality. Schedules that get defended in meetings reflect hope.

---

### REPORTING SCHEDULE STATUS (12:00–13:10)

*[Example slide: the precise slip sentence]*

Now, how you report it. Your status report usually carries a schedule view, and the tempting version is a big Gantt chart with colored bars. The useful version is shorter and far more specific.

A good schedule status answers three things. Are we on track for the next major milestone? What has slipped, and what's the impact? What's at risk of slipping, and when will we know? Three sentences, not three pages. Attach the detailed Gantt for anyone who wants it — but the narrative is what the sponsor actually reads.

And when something has slipped, name it precisely. Here's the exemplar I want in your head. "Integration delivery slipped from May twenty-eighth to June eleventh due to vendor capacity; testing start pushed from June first to June fifteenth; milestone three-week slip absorbed into existing buffer, no end-date impact."

Read that again in your mind. It tells the reader what happened, why, what the downstream effect is, and whether the end date is moving — in one sentence. It treats the sponsor as somebody capable of hearing bad news. Because they are. Remember my sponsor on the regulatory project. He wasn't furious about the three-week slip. He was furious that he'd been looking at green for seven weeks. The slip cost him a few weeks. The surprise cost him his trust. Never confuse the two.

---

### AUDIT, DON'T REWRITE (13:10–13:55)

*[Statement slide]*

One last discipline, because it's the one coordinators get wrong with the best intentions. When your PM asks you to review a schedule ahead of a steering committee, your job is to surface what the snapshot is hiding — not to redraft it.

The leads who built it are the right people to update it. Your contribution is the careful read, the cross-check against actuals, the named omission, the precise question. Building your own version two and recommending it go straight to the committee is the same anti-pattern as rewriting someone's work breakdown solo — you produce an artifact the doers didn't contribute to and won't believe. The schedule is built by the doers and maintained by the PM. You audit it. And you protect the project from the polite fiction.

---

### WHAT YOU'RE GOING TO DO (13:55–14:30)

*[Slide: workbook brief + close]*

Here's your work for this lesson. Open your project's real schedule and write down the five-to-ten activities on the current critical path — then notice whether it's shifted since kickoff, because that shift is information that's probably never been broadcast. For each of those activities, form a view of the actual status, not the reported one. Check whether you have named buffer, and how much you've burned. And find one package that's reported the same percentage for more than two status cycles — that's your rounding-up signal — and go investigate it.

*[Back on camera, slower]*

I opened with a schedule that lied to me every Friday for six weeks. It didn't lie because anyone was dishonest. It lied because I was updating a file instead of verifying a model of reality. That distinction — file versus model — is the whole craft of this lesson. Spend the next two weeks living on the right side of it.

See you in the workbook.

---

*[End card: Lesson 10, Schedules, Dependencies, and the Critical Path. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slide for the cold open; statement slides for the "model of reality" frame and audit-don't-rewrite; list slides for the four dependency categories, the critical-path rules, and the five honesty defenses; a def slide for float/slack vs buffer; an example slide for the precise slip sentence.

**Integrity:** The cold-open "schedule that lied every Friday," the run-rate-style sponsor quote ("I have been looking at green for seven weeks"), and the slip-sentence exemplar are drawn verbatim in substance from the instructor's handbook (Ch 10), narrated in first person — the handbook author tells this story in the first person, so the first-person scene is faithful, not fabricated. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 1 / Lesson 20 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
