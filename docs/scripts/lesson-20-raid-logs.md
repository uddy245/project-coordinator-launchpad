# Lesson 20 — RAID Logs: The Project's Early Warning System
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 14
**Ticket ref:** LES-004 (video player integration), Bunny Stream upload
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught

---

### COLD OPEN — The risk I saw and did not raise (0:00–1:15)

*[On camera, direct address. No slides yet.]*

I want to start this lesson with a mistake I made, because the mistake is the whole lesson.

Some years ago I was on a capital-markets operations project, coordinator-level role, and I noticed something about one of the client-side SMEs. She was the only person on their team who genuinely understood a specific legacy calculation engine. And she was disengaging. She'd moved to a new role within her organization, and while officially she was still on our project, she was increasingly unavailable. Meetings she was supposed to join went unattended. Questions we sent her went unanswered for days.

I noticed this in early March. I noted it in my own working file. I did not put it on the project's RAID log, because the RAID log was reviewed in the weekly status meeting, and I did not want to be the junior coordinator who raised an issue about a named senior person on the client side.

In May, she effectively withdrew. No formal conversation. She just stopped responding. The calculation engine work ground to a halt. We spent six weeks identifying and briefing a less senior replacement. The project slipped five weeks. My PM asked, in the post-mortem, how we hadn't seen this coming.

I had seen it coming. For two months. I had watched a risk grow in my notebook and chosen not to put it in the place the project could actually act on it.

This lesson is about the RAID log — what it is, how to fill it in honestly, and what it actually costs when you do it wrong. Which, as you just heard, I know from experience.

---

### WHAT RAID ACTUALLY STANDS FOR (1:15–3:00)

*[Slide: four-letter breakdown with one-line definitions]*

RAID stands for four things: Risks, Assumptions, Issues, Dependencies. Four categories of thing that might move your project, tracked in one log.

A **risk** is something that *might* happen but hasn't yet. It has a probability. It has an impact. You watch it. You try to reduce one or the other. If it materializes, it's no longer a risk — it's an issue.

An **issue** is something that *has* happened and is affecting the project now. Issues require action, not monitoring. This distinction matters more than it sounds. When people log issues as risks, the project fails to act on things that have already happened. When people log risks as issues, the project panics over things that may never occur.

An **assumption** is something the project is taking as true without having verified. Every plan rests on assumptions. Naming them makes them examinable. An assumption that turns out to be false is a risk that materialized without being on the risk list — which is exactly what hurts projects.

A **dependency** is something the project needs from outside its direct control. The vendor's deliverable. The stakeholder's decision. The compliance approval. Dependencies usually generate risks, but they're worth tracking separately because they require active coordination rather than just monitoring.

Some organizations use only risks and issues. Some lump assumptions into risks. None of that matters as much as what I'm about to tell you, which is how to actually write a good RAID entry.

---

### WHAT A GOOD ENTRY LOOKS LIKE (3:00–5:30)

*[Slide: example risk entry, annotated]*

Here's what most junior coordinators write when they add a risk:

> "Resource availability remains a risk."

This sentence is useless. It's true on every project ever run. It gives the reader no information about what to actually do. If the worst risk you can articulate is this, you haven't thought about your project hard enough.

Here's what a real risk entry looks like.

> "Client-side SME Jennifer Chen may become unavailable due to competing demands in her new role at the client. Impact: the calculation engine workstream loses its only domain expert. Probability: medium and rising (two meetings missed in the last three weeks). Owner: our technical lead, Rahul, to identify a backup SME by April 12. Mitigation: secure contingent access commitment from her manager before the current sprint ends. Next review: next Tuesday."

Five things in that entry, and every one of them matters.

**One:** a specific statement of what might go wrong. Not "resource risk" — the actual risk, named.

**Two:** an honest probability and impact. Not calibrated for politics. Not softened so the status goes green. The real number.

**Three:** a single named owner. Not "the team." Not "we." A person. Rahul. If there's no name, there's no owner, and if there's no owner, the risk just sits there.

**Four:** a specific mitigation plan. What the project is actually doing — or will do — to reduce probability or impact. Not "monitor closely." Not "keep an eye on." A concrete move, with a date.

**Five:** a review date. When will we look at this again? If it sits untouched for three months, it's not a risk log entry anymore. It's decoration.

A good risk entry is a tool you could hand to a PM who joined the project yesterday, and they could act on it. A bad risk entry is a sentence you wrote so the log wouldn't be empty.

---

### THE HARD PART — KEEPING IT HONEST (5:30–8:15)

*[On camera again, direct]*

Now we get to the hard part. Which is not the format. Which is not the template. Which is not any mechanical thing I can teach you in a video.

The hard part is the part where I said nothing about Jennifer Chen for two months.

Let me name the reasons people don't add things to the RAID log. They're predictable and they're every one of them wrong.

You don't want to be the one who raises a politically sensitive issue. I get it. The SME is senior. Her manager is senior. Raising it feels like accusing someone.

You fear that raising a risk implies blame for the situation. That if you log it, you'll be asked why the project has this risk, as if logging a risk caused it.

You hope the problem will resolve itself. Maybe she'll come back. Maybe the cross-team pressure will ease. Maybe someone else will flag it first.

You're busy. You'll get to it next week. The tracker will still be there.

You want more evidence first. You're not sure yet. You don't want to cry wolf.

Every one of these is a reason. None of them is a good reason.

The right posture — which my PM taught me the hard way, after the Jennifer Chen thing blew up — is that the RAID log is a **professional tool**, not a personal judgment. Adding something to it is how a project says "this deserves attention." It is not an accusation of anyone. It does not say you caused the risk. It does not say you think someone is incompetent. It says you noticed something that might affect the project, and you are doing the thing coordinators are paid to do, which is making it visible.

Silent watching isn't neutral. Silent watching is worse than nothing, because your private awareness is a substitute for the project actually doing something. When you're watching alone, no one else is. When it's on the log, the team, the PM, the sponsor can all see it and make choices.

Put it on the log. If you're not sure, put it on the log. If it turns out to be nothing, you close it with a note. That's a thirty-second paperwork cost. The alternative, which I learned, is five weeks of slip and a post-mortem you remember a decade later.

---

### RISKS VS ISSUES — THE SEPARATION THAT MATTERS (8:15–10:00)

*[Slide: same incident shown as risk entry, then as issue entry after materialization]*

One more discipline before we get to the workbook.

Risks and issues often describe the same underlying situation at different times. Jennifer might disengage. That's a risk. Jennifer has disengaged. That's an issue.

When the risk materializes, you don't just leave the risk entry sitting there. You close the risk, explicitly, with a note that it became an issue, and you open a new issue entry with what's happening now and what the project is doing about it. This takes maybe sixty seconds. It is not optional.

Projects that don't do this end up with RAID logs full of "risks" that are really issues the team is pretending haven't happened yet. The log gets read as theater rather than as a working tool. Everyone stops believing it. And the one time the risk entry was actually a live risk, nobody notices, because they've trained themselves to skim past them.

Keep risks as risks. Convert them to issues when they materialize. Close what's genuinely closed. Be specific about dates and transitions.

---

### THE PRE-MORTEM — A PRACTICE WORTH STEALING (10:00–11:15)

*[Slide: pre-mortem prompts]*

One practice worth adopting, because it changes how your RAID log looks, is the **pre-mortem**.

A pre-mortem is a thirty-minute exercise at the start of a project phase where the team imagines the phase has just failed. You say, "It is September. The milestone is missed. What happened?" Then you work backwards.

The questions this format draws out are different from the questions a traditional risk workshop draws out. People are much better at imagining concrete failure modes in scenarios than at brainstorming abstract risks. You'll get answers like "the vendor's key architect went on paternity leave mid-sprint and we hadn't backstopped" instead of "vendor resource risk." The first is a useful RAID entry. The second is wallpaper.

You don't have to formalize it. You can propose it casually. "Let's take thirty minutes and imagine what could go wrong between now and the milestone." The output goes into the RAID log with the usual five-element discipline.

Pre-mortems are underused and disproportionately valuable. Bring them to your next phase start.

---

### WHAT YOU'RE GOING TO DO (11:15–13:30)

*[Slide: workbook brief + artifact brief]*

Here's your work for this lesson.

First, you're going to download the starter RAID log template from the Workbook tab. It's an Excel file with the five-column structure we've been using: category, description, probability and impact, owner, mitigation, review date. The structure is boring on purpose. Structure is not where the skill lives.

Second, you're going to read the scenario — it's in the Workbook tab, about 500 words. A specific project, with specific people and constraints. Read it once for context, then once more for risk signals. I'll name a few things to look for in a second.

Third, you're going to build the RAID log for that scenario. Aim for between eight and fifteen entries across R, A, I, and D. Not fifty entries — that's a sign you haven't prioritized. Not three — that's a sign you haven't thought hard enough.

And here's what we'll be grading on. Five dimensions.

**Completeness** — every risk has all five elements I described. Owner, mitigation, impact, probability, review date.

**Differentiation** — risks are risks, issues are issues, assumptions are assumptions, dependencies are dependencies. No miscategorization.

**Mitigation realism** — mitigations are specific and actionable, not "monitor closely."

**Ownership** — every entry has a named person or explicit role. Not "the team." Not "TBD."

**Living-artifact evidence** — your log shows evidence that it's been updated over time. If every entry looks like it was written at the same moment with no weekly progression, that's a tell.

The quiz is ten items. Eight or better to pass. The artifact is the real deliverable — the RAID log itself, graded against those five dimensions.

When you upload it, you'll get scores on each dimension within about two minutes, with a direct quote from your submission justifying each score and one specific suggestion for improvement. If you want a human to also review your submission, there's a button for that — use it whenever you want a second opinion.

*[Back on camera, slower]*

One last thing. I want you to notice something about the Jennifer Chen story I told you at the top. The lesson isn't "always log everything." The lesson is that **silent watching is worse than nothing**. When you can see a risk and the project can't, your awareness is misleading the project. Putting it in the log is the move that costs you almost nothing and saves the project sometimes a great deal.

When in doubt, put it on the log.

Get your hands on the template. See you in the workbook.

---

*[End card: Lesson 20, RAID Logs. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Three distinct visual modes — narrator on camera (cold open, hard-part section, closing), slides (the breakdowns and examples), and over-the-shoulder screen (template walkthrough, could be stitched from the workbook panel content).

**Captions:** Full transcript of this script lives at `/lessons/raid-logs?tab=video&captions=on`.

**Progress tracking:** Per LES-004 ACs, 90% watched = `lesson_progress.video_watched=true`. 10-second intervals. Resume-from-last-position required.

**Asset handoff:** Script + slide deck source + recorded video → Bunny Stream. Bunny URL goes into `lessons.video_url` via production seed script (not the MVP local seed).
