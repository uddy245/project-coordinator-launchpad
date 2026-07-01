# Lesson 8 — Reading and Writing Requirements Without Drowning
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 8; reading `docs/lessons/requirements-literacy.md`
**Lesson slug:** requirements-literacy
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1 and Lesson 20.

---

### COLD OPEN — The requirement that meant three different things (0:00–2:30)

*[Story slide. Direct address.]*

I want to tell you about a single line on page forty-seven of a hundred-and-thirty-page document, because that one line cost a project six weeks and two hundred thousand dollars — and I watched it happen, knowing something was wrong, and said nothing.

This was year five or six of my coordinator career. I was on a data warehouse project for a health insurance company — building a platform that would feed reporting to actuarial, claims operations, clinical, and finance. Six-month build, three business units, two vendor teams. Somewhere in the requirements document there was a line that read: *the system shall provide daily claims reporting.*

I read it in my first week. I registered it. I moved on.

Three months later, in a walkthrough with the claims operations team, an ops manager asked, casually, what time the daily reports would be available each morning. The lead BA — a woman named Anu, whose judgment I trusted — said, "they'll be refreshed by seven a.m. each business day, based on the prior day's data." The room nodded. We moved on.

Later that week, in a different conversation, someone on the actuarial team mentioned looking forward to running reports throughout the day against "daily-refreshed" data. And I paused. I had a very specific feeling — the kind I've since learned to treat as a signal rather than noise — that these two people were describing two different things. To the ops team, "daily" meant *updated once per day, ready at seven a.m.* To actuarial, "daily" seemed to mean *containing today's claims, available in near-real-time.*

I almost flagged it. Then I thought: *this is probably my misunderstanding. Anu has been through this in detail. I'd just be the junior coordinator correcting a senior person.* I made a mental note to ask her. And then I didn't. Not the next time we spoke, or the time after that.

---

### THE COST OF THE SIGNAL I SWALLOWED (2:30–4:00)

*[Story slide.]*

Three weeks later, the architecture was finalized on a daily batch refresh at six-thirty a.m. — the ops interpretation. Two months after that, in user acceptance testing, the actuarial team logged what they called a severe defect: they could not see same-day claims activity. An impassioned email went from their director to the sponsor. It had to be escalated. A meeting was convened.

And in that meeting it became clear that the two teams had, for the entire project, held two different mental models of what "daily claims reporting" meant. The document never specified refresh frequency versus freshness of data. The BA had clarified it with one team and not the other. The architecture reflected one reading. The expectation reflected the other.

The fix required architectural rework — roughly six weeks, about two hundred thousand dollars. The sponsor was unhappy. Anu was mortified. I felt sick.

In the post-mortem, I told my P-M what I'd noticed, and when. And she was kind, but she was direct. She said: *"You had the signal. You had the responsibility to surface the signal. Surfacing the signal is not 'interfering with the BA.' It is doing your job."*

I did not forget that line. This whole lesson is built on it.

---

### REQUIREMENTS ARE EVERYONE'S DOMAIN (4:00–5:10)

*[Statement slide.]*

Here's the idea that line cracked open for me. Requirements feel like the business analyst's artifact. The BA writes them. The P-M owns them as a project artifact. The team builds to them. The stakeholders live with them.

But the coordinator — you — reads them, watches them, traces them through the project, and notices when something is not quite right. Your noticing is part of the quality control of the project. And it does not require you to be a business analyst.

So let me give you the way of reading that would have caught my "daily" problem in week one — and the specific, low-cost moves that turn your noticing into something the project can actually use.

---

### WHAT REQUIREMENTS ACTUALLY ARE (5:10–6:40)

*[List slide: Shallow · Deeper · Deepest]*

Start with what requirements actually are, because the textbook definition is thin. There are three layers, each one truer than the last.

Shallow: requirements are statements of what the thing being built must do. *The system shall produce monthly reports.* That's the unit of the document.

Deeper: requirements are the accumulated representation of what a set of stakeholders said they need, mediated by the analysts who tried to make it precise enough to build from. The word "accumulated" matters — requirements are rarely drafted whole. They emerge over weeks, through interviews and workshops and iteration. They're a negotiated product.

Deepest, and this is the one the textbooks miss: requirements are a bet about what people will actually use. The claim is always partly wrong. Some requirements describe things nobody needs. Some real needs never make it into the document. And some language means different things to different readers — like "daily." So you don't read requirements as a contract that can't be questioned. You read them as a hypothesis, and you stay alert for signs the hypothesis is drifting from reality.

---

### THE TYPES THAT MATTER (6:40–8:00)

*[List slide: the requirement categories]*

Requirements come in categories, and they matter because they fail in different ways.

Functional — what the system does. Usually the bulk. Easiest to test. Non-functional — how well it does it: speed, reliability, security. Often underspecified, and that's where a lot of project trouble lives. A system that meets every functional requirement but is too slow to use is, in practice, a failed system.

Business requirements are the organizational objective behind the project — the "why" behind the "what." You should be able to trace a functional requirement up to the business requirement it serves. User or stakeholder requirements are the bridge between the two, elicited from the actual people who'll use the thing. Data requirements — inputs, outputs, storage, formats — are often where the real complexity of an integration-heavy project hides. And regulatory or compliance requirements are usually non-negotiable; you cannot trade them against scope or cost.

You don't need to be the person sorting requirements into these buckets. You need to notice when the buckets are being blurred — non-functional constraints buried in functional sections, regulatory items tucked where they'll get overlooked. Because blurred categories lead to missed requirements, and missed requirements lead to rework.

---

### HOW REQUIREMENTS GO WRONG, PART ONE (8:00–9:20)

*[List slide: Ambiguity · Incompleteness · Conflict]*

Requirements fail in specific, recurring ways. Here are the first three.

Ambiguity — a requirement you can read more than one way. My "daily" story was ambiguity. Watch for the landmine words: *timely, user-friendly, secure, robust, fast, intuitive, automated, seamless, real-time, scalable.* They feel precise until you push on them. When you see one, ask: what's the specific, measurable threshold?

Incompleteness — a requirement that states what must happen but not the edge cases. *The system shall allow users to upload documents.* Fine — but what file sizes? What types? What happens if the upload fails partway, or the file is corrupted? Incompleteness produces things that look like specifications but leave developers guessing at hundreds of small decisions.

Conflict — two requirements that can't both be met. *Produce reports within five seconds* and *include every transaction from the previous month* may quietly conflict at volume. Documents rarely flag their own conflicts. They surface during the build, when a developer discovers they can't satisfy both.

---

### HOW REQUIREMENTS GO WRONG, PART TWO (9:20–10:50)

*[List slide: Assumptions · Abstraction · Current-system · Solutions]*

And four more.

Unstated assumptions — *integrate with the existing customer database* assumes that database is stable, accessible, and documented. When the assumption fails, the requirement is unimplementable as written.

Wrong level of abstraction — either too vague, *the system shall be user-friendly*, or too prescriptive, *the login button shall be blue, sixteen pixels by forty, top right.* Good requirements describe what must be true; they don't dictate how.

Requirements that describe the current system instead of the desired one — this happens when analysts capture how people work today and write it up as a requirement for tomorrow. You end up automating an existing bad process instead of improving it.

And requirements that are really solutions in disguise — *"we need a new field on the claim form for region code."* Maybe. But the underlying need — segment claims by region — might be met another way entirely. When a requirement is phrased as a solution, the team builds the solution without ever asking whether it's the right one.

You don't have to be a BA to catch most of these. You have to read the document carefully and notice where your own reading felt uncertain. The uncertainty is the signal.

---

### READING CRITICALLY — THREE PASSES (10:50–12:10)

*[List slide: Structural · Substantive · Critical]*

So how do you actually read a hundred-page requirements document without drowning in it? Three passes, three or four hours of focused time spread across a few days.

Pass one is structural. You're learning the shape. How is it organized? Roughly how many requirements — hundreds or thousands? What's the numbering scheme? Is there a glossary, a traceability matrix? This pass tells you how to navigate later.

Pass two is substantive. You skim the requirements themselves — not memorizing each one, but building a mental map of what the project is supposed to build, noticing which stakeholders each section serves, forming a sense of scope.

Pass three is critical. Now you read for the failure modes. Ambiguous words. Incompleteness. Possible conflicts. And the phrases that signal unstated assumptions — *as per current practice, consistent with existing systems, following standard protocols.* Those phrases mean something — but the meaning lives in someone's head, not in the document. Keep a short list as you go. Not long — five to ten items on a hundred pages. Those are your watchpoints.

---

### THE TWO-MINUTE NOTE (12:10–13:00)

*[Example slide: the clarification note]*

And here's the single highest-leverage move in this entire lesson. When you find an ambiguity, you send a short note to the BA. Not an exhaustive analysis — just a question.

*On requirement four-point-three-point-seven, "daily reporting" — can you confirm whether we mean daily refresh or near-real-time? I can see either reading.*

Two minutes to write. That's it. The BA either comes back with "yes, it means X, confirmed with the stakeholder" — great, you have closure — or with "huh, good catch, let me check" — even better, you just prevented a failure. Either outcome is valuable, and the cost of sending the note is trivial. That is the entire move I failed to make on the "daily" project. A two-minute email would have saved six weeks.

---

### TRACEABILITY, QUIETLY (13:00–13:50)

*[List slide: the traceability moves]*

One more piece of leverage, and it's an unglamorous one: traceability. The discipline of linking each requirement to where it came from and where it shows up in the build. A project with it can answer "why are we building this?" and "if we cut this feature, which business objective dies?" A project without it can only have arguments — "I thought we were building X" versus "no, we agreed Y" — with no evidence to settle them.

Four notes. Don't trace at the lowest atomic level — you'll never maintain a three-thousand-row matrix; aim at requirement groups or user stories. Keep traceability visible during change requests, so downstream effects aren't pure guesswork. Flag untraceable requirements as risks — a requirement nobody can tie to an objective is either scope that shouldn't be there or traceability that's broken. And use it in testing, not just planning, so "seventy percent passed" actually means something. You don't have to evangelize. You just quietly maintain it better than it would otherwise be maintained.

---

### THE LINE BETWEEN THE TWO FAILURES (13:50–14:30)

*[Statement slide, then workbook brief + close]*

Before your work for this lesson, the thing that matters most. There are two opposite ways to get this wrong. One is self-suppression — "this is the BA's job, not mine" — which is exactly what I did with "daily." The other is overstep — rewriting the requirements yourself, declaring the BA wrong, making yourself the requirements authority off a single critical pass. The right posture sits between them. You notice. You surface — through the right channel, to the right person, in proportion to what you saw. A clarification note to the BA. A RAID entry for a live risk. An item for your P-M one-on-one for a governance question. The noticing is your contribution. The deciding is the P-M's and the BA's.

*[Slide: workbook brief + close]*

Here's your work. In the workbook, you'll give your own project's requirements — or its scope statement, or its backlog — a ninety-minute critical pass and build a short watchpoint list. You'll take three requirements and describe, in your own words, how you'd verify each one is met; if you can't, it's probably ambiguous. And then the real one: think of *one* thing you're not sure the stakeholders and the team understand the same way. One thing. Send the two-minute note.

*[Back on camera, slower]*

I started with that line on page forty-seven because it's the whole lesson in miniature. I had the signal. I swallowed it, because surfacing it felt like overstepping. It wasn't. Surfacing the signal is not interfering with the BA — it is doing your job. Spend this lesson learning to send the note.

See you in the workbook.

---

*[End card: Lesson 8, Reading and Writing Requirements Without Drowning. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slides for the cold open and the cost of the signal; statement slides for "requirements are everyone's domain" and the two-posture line; list slides for the three layers, the types, the two halves of the failure modes, the three passes, and traceability; an example slide for the two-minute clarification note.

**Integrity:** The "daily claims reporting" cold open, the dollar/timeline figures, the BA named Anu, and the PM's post-mortem line are all drawn verbatim-in-substance from the instructor's handbook (Ch 8), narrated in first person. The narration belongs to the handbook author; confirm voice ownership before publishing. No personal details were fabricated.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 1 / Lesson 20 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
