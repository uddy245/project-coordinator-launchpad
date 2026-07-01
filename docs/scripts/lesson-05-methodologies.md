# Lesson 5 — Waterfall, Agile, and the Space Between
## Video script (14 minutes)

**Target runtime:** 13:30–14:30
**Source chapter:** Handbook Ch 5; reading `docs/lessons/methodologies.md`
**Lesson slug:** methodologies
**Narrator style:** first-person senior PM, warm but direct, no PM jargon unless it is being explicitly taught. Same voice as Lesson 1 and Lesson 20.

---

### COLD OPEN — The argument that wasn't about methodology (0:00–2:10)

*[Story slide. Direct address.]*

About twelve years into my career, I was the PM on a project that should not have been complicated. A mid-sized insurance firm wanted to replace its customer portal. The scope was well understood. The technology was familiar. The team was experienced. The sponsor was engaged. There was no good reason for the project to become a referendum on how we worked.

It became a referendum on how we worked anyway.

Six weeks into planning, my lead developer — a man in his late thirties named Marcus, who'd spent the previous three years in a pure Scrum environment — informed me that he would not participate in "waterfall theater." He wouldn't estimate tasks at the detail the PMO required. He wouldn't commit to a schedule beyond a rolling six weeks. He wouldn't attend what he called "ceremonial status meetings."

The PMO director — a woman named Caitlin, who'd come up through a heavily PRINCE2 environment — sent Marcus a crisp note explaining that the organization had agreed methodology standards, that those standards applied to all projects over a certain budget, and that she'd be happy to discuss exceptions through the established governance process.

The argument that followed consumed four weeks of planning and, by my count, seven separate meetings. Marcus produced a document arguing waterfall was discredited. Caitlin produced one arguing agile was unsuited to regulated work. He called her thinking outdated. She, more politely, called his approach ungovernable. Both of them, separately, told me the other one "didn't understand project delivery."

It was, looking back, a completely avoidable argument. Neither of them was wrong in the way they claimed the other was wrong. They were having a religious debate when they should have been having a design conversation.

---

### HOW IT ACTUALLY RESOLVED (2:10–3:15)

*[Story slide]*

What eventually resolved it — not through anyone's brilliance, but through the slow pressure of the sponsor needing the project to *start* — was a very practical compromise. The development work ran in two-week sprints, with a backlog and ceremonies. Marcus got his working model. The overall project kept its charter, its roadmap, its budget baseline, its risk register, and its monthly steering committee. Caitlin got her governance.

And the status reports to the PMO? They were produced by the coordinator, from the sprint outputs, translated into the format the PMO expected. The two worlds met at the coordinator's desk.

The project delivered on time, in budget, with no drama. No one wrote a case study about it. It was also, I came to understand, exactly how most real projects work. Hold onto that, because the whole lesson lives inside it.

---

### WHY THE DEBATE FEELS BIGGER THAN IT IS (3:15–5:00)

*[List slide: Tribal · Commercial · Political]*

Before the substance, you need to understand why these arguments get so heated — because if you take the methodology war at face value, you'll be useless in resolving it.

Three forces are at work. First, it's tribal. People identify with the approach they were trained in. Agile practitioners have often had conversion experiences — they escaped a dysfunctional waterfall shop and felt agile save them. Waterfall practitioners have watched agile fail spectacularly — teams that called themselves agile while just being undisciplined. Both have real experience behind their positions. Both also generalize from it to conclusions that don't quite hold.

Second, it's commercial. There's a large consulting industry selling agile transformations, certifications, and scaled frameworks. There's a parallel, older industry selling traditional project management training. Both have financial incentives to call their approach universal and the other obsolete. A lot of what you read about methodology online is content marketing dressed as analysis.

Third — and this is the one that matters most to you — it's political. "We are agile" often means *the development team controls delivery cadence.* "We follow the PMO" often means *the PMO controls how work is tracked and reported.* The methodology fight is usually a fight about who controls the project, dressed up as a fight about how the project should be run.

When you can see that, you can work around it. When you can't, you'll think Marcus and Caitlin were arguing about schedule formats. They weren't.

---

### WHAT WATERFALL ACTUALLY IS (5:00–6:50)

*[Def slide: Waterfall — sequential, gated, change-controlled]*

Now the substance. Set the caricature aside.

Waterfall is a sequential model where the phases run in order, and each phase's outputs feed the next. Requirements, then design, then implementation, then testing, then deployment. Each phase has a gate. Moving between them is a deliberate transition, usually marked by formal acceptance of the previous deliverables.

The defining characteristic — write this down — is that *change is managed through formal change control.* New requirements that emerge during implementation are not silently absorbed. They go through a change request: analyzed, costed, approved or rejected by a change control board. That process exists because, in this model, late changes are expensive — and the discipline is designed to make the cost visible *before* the change is absorbed.

So where does waterfall genuinely work? Where the scope is knowable in advance and stable. Where mid-flight change is expensive. Where strong governance is required. Construction. Infrastructure. Banking core systems. Medical devices. Safety-critical software.

And where does it fail? Where the scope is genuinely unknowable, where requirements emerge through the work, where the cost of guessing wrong up front is higher than the cost of changing course. Most product development. Most research-intensive work.

The common misreading is that waterfall *forbids* change. It does not. It channels change through a specific process. Whether that process is useful or burdensome depends entirely on the project.

---

### WHAT AGILE ACTUALLY IS (6:50–8:30)

*[Def slide: Agile — principles, not practices]*

Agile, at its core, is a set of *principles* — not a specific set of practices. A team can be agile without using Scrum. A team can use every Scrum ceremony and not be agile at all.

The principles, stripped down, are about three things. One: short feedback cycles. Build something small. Show it to people who'll use it. Learn. Adjust. Build the next small thing. Two: adaptive planning. Plan the next two weeks in detail, the next three months at a higher level, and revise as you learn. Don't commit to detailed plans for work far enough out that you don't yet know what it should be. Three: team empowerment. The people who do the work make most of the decisions about how it gets done.

Where agile works: requirements emerge through the work, the cost of changing direction is low, the team has real autonomy, the product can be delivered incrementally. Most software. Most digital products.

Where it fails: scope is stable and knowable, governance requires up-front approvals, delivery has to land all-at-once, the team isn't actually autonomous. And it fails, often spectacularly, when "agile" is just cover for a lack of discipline.

So let me name something plainly, because you'll need it. A lot of projects that call themselves agile are not agile in any meaningful sense. They're undisciplined. Agile, properly applied, requires *more* discipline than traditional project management — not less.

---

### SCRUM, AND THE SCRUM-BUT TRAP (8:30–10:15)

*[List slide: Three roles · Three artifacts · Fixed cadence]*

Scrum is the most widely adopted agile framework, and people use "agile" and "Scrum" interchangeably, which is wrong but common. You'll encounter it, so know it.

Three roles. The product owner is accountable for what gets built and in what order — they own the backlog. The Scrum Master is accountable for the process working — removing impediments, protecting the team. The development team is accountable for building the thing.

Three artifacts. The product backlog — everything that might be built. The sprint backlog — what the team committed to this sprint. The increment — the working output produced. And a fixed cadence: two-week sprints, bracketed by planning, daily scrum, review, and retrospective. That's it. That's Scrum. You can read the official Scrum Guide in an hour, and you should.

Here's the part that matters for you. Scrum works when its constraints are honored — the product owner really has authority, the team really is protected during the sprint, retrospectives really produce change, increments really are shippable. Scrum works *badly* when those constraints are ignored while the ceremonies continue. The "product owner" escalates every decision to a committee. The team gets interrupted mid-sprint by senior stakeholders. Retros become ritualized complaint sessions. The "increment" is a progress report dressed as software.

This is so common it has a name: Scrum-but. As in, "we do Scrum, *but...*" When you work with a Scrum team, your job is *not* to impose your preferred artifacts on them. Your job is to translate between their cadence and the rest of the project's.

---

### THE HYBRID REALITY (10:15–11:50)

*[Example slide: the hybrid project, then the translator's desk]*

Now the part most methodology discussions skip. Most real enterprise projects are hybrid — and hybrid is not a failure of methodological purity. It's often the right answer.

Picture the typical shape. The *overall project* has a charter, a business case, a budget baseline, a risk register, a stakeholder plan, and a steering committee. All of that is waterfall-shaped. Inside that frame, the workstreams with the most uncertainty run with agile practices. Software in sprints. Design in cycles. Testing continuous rather than phase-gated. But procurement still follows a procurement process, change management still runs structured communications, and the project still has to hit a deadline.

This isn't a compromise forced by politics. It's a recognition that different parts of a project have different characteristics and benefit from different practices. The skill is fitting the practice to the work — not enforcing one methodology across all of it.

And the coordinator's job, on a hybrid project, is the translator role from my opening story. You take the agile outputs and format them for the waterfall governance. You take the governance constraints and communicate them to the agile teams without disrupting their cadence. You maintain artifacts at both levels — the project-level risk register and status narrative, and the sprint-level backlog and burndown — and you keep them consistent. That's harder than running a pure methodology. It's also where most real projects live.

---

### THE FOUR-QUESTION DIAGNOSTIC (11:50–13:05)

*[List slide: Scope · Cost of change · Interdependence · Governance]*

So how do you reason about fit without picking a tribe? Ask four questions about the project.

How stable is the scope? Stable and knowable, lean waterfall. Emergent, lean agile. How expensive is mid-flight change? Cheap, and agile reduces the cost of discovery. Expensive, and waterfall reduces the risk of rework. How interdependent is the work? Self-contained, and agile lets the team move fast. Deeply coordinated with other programs, and waterfall makes the coordination explicit. And what governance does the environment require? Heavy up-front approvals, and you'll need waterfall-shaped governance regardless of how delivery runs. Lightweight, and you have more freedom.

Notice what's *not* on that list. Not "what does the team want." Not "what's the org's standard." Those constrain what's possible, but they shouldn't drive the answer. The work drives the answer. Everything else is constraint.

And the answers almost never point to *pure* anything. A software build in a regulated bank: heavy waterfall frame, sprint execution. An exploratory product in a startup: light frame, sprints everywhere. A construction project: mostly waterfall, with iterative practices for design. Hybrid, weighted one way or the other. Almost always.

---

### YOUR ROLE — THE SWITZERLAND OF METHODOLOGY (13:05–13:50)

*[Statement slide]*

Which brings me to the most important thing I'll tell you this lesson. Your job, in the middle of all of this, is *not to take a side.* It is to make the work visible in whatever format the different parties need.

If the PMO needs traditional status reports, you produce them — from whatever the delivery team gives you. If the team needs sprint autonomy, you support it — while translating their outputs upward. You are the Switzerland of methodology. You do not win converts. You get the work done.

Let me be blunt. Do not get pulled into the methodology wars. If a developer tells you waterfall is dead, listen politely and redirect to the work. If a PMO director tells you agile can't work here, listen politely and redirect to the work. This isn't cowardice. It's judgment. You're early in your career — you don't have the reputation capital to fight this battle, and you don't need to. Your job is to make whatever the decision-makers decide actually *work.*

---

### WHAT YOU'RE GOING TO DO (13:50–14:30)

*[Slide: workbook brief + close]*

Here's your work for this lesson. In the workbook, you'll write down what methodology your current project *actually* runs — not what it says it runs. Look at the artifacts. Look at how decisions get made. Look at how change is handled. The gap between official and actual is itself useful information. Then you'll find the translation work: is your project hybrid, and if so, who's bridging the two layers? If no one is, that gap is often yours to fill.

*[Back on camera, slower]*

The reason I started with Marcus and Caitlin is that their fight is the whole lesson in miniature. Two competent people, a completely avoidable war, and a resolution that nobody bragged about — the development ran in sprints, the governance stayed in place, and the two worlds met at the coordinator's desk. That desk is going to be yours. Don't spend your energy deciding who was right. Spend it making the work visible to both of them. That's the craft.

See you in the workbook.

---

*[End card: Lesson 5, Waterfall, Agile, and the Space Between. Next up: the Workbook tab.]*

---

### Production notes

**Cuts:** Story slides for the cold open, the resolution, and the close; def slides for waterfall and agile; list slides for the three forces, Scrum, and the four-question diagnostic; an example slide for the hybrid reality; statement slide for the Switzerland role.

**Integrity:** The Marcus-and-Caitlin insurance-portal story and the "Switzerland of methodology" framing are drawn from the instructor's handbook (Ch 5), narrated in first person. The opening "twelve years into my career" detail and the named characters are the author's own. Confirm narration voice belongs to the handbook author before publishing.

**Runtime:** ~2,050 words; expect ~13:30–14:30 at the Lesson 20 ElevenLabs pace. Final runtime self-corrects to real audio length in build_video.py.
