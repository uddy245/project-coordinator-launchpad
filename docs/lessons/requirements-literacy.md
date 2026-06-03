# Reading and Writing Requirements Without Drowning

## The requirement that meant three different things

Year five or six of a coordinator career. Data warehouse project for a health insurance company — actuarial, claims operations, clinical, finance. Six-month build. Hundred-and-thirty page requirements document. Page forty-seven contained one line:

> *The system shall provide daily claims reporting.*

It was read. It was registered. It moved on.

Three months later, a claims operations manager asked, casually, what time the daily reports would be available. The BA answered: "refreshed by 7am, prior day's data." Nobody pushed back.

That same week, in a different room, the actuarial team mentioned looking forward to running reports throughout the day against "daily-refreshed" data. The coordinator paused. There was a specific feeling — *these two people are describing different things*. To the ops team, "daily" meant *updated once per day*. To actuarial, "daily" meant *containing today's claims, available in near-real-time*.

The coordinator almost flagged it. Then thought: *the BA has been through this in detail; I would just be the junior person correcting a senior one.* Made a mental note. Forgot.

Three weeks later the architecture was finalised on a daily batch refresh at 6:30am — matching the ops interpretation. Two months after that, in UAT, actuarial logged a severe defect: they could not see same-day claims activity. An impassioned email went to the sponsor. A meeting was convened. The two teams had, for the entire project, held two different mental models of what "daily claims reporting" meant.

The resolution required architectural rework: roughly six weeks, about two hundred thousand dollars.

In the post-mortem, the PM was direct:

> *"You had the signal. You had the responsibility to surface the signal. Surfacing the signal is not 'interfering with the BA.' It is doing your job."*

Requirements are everyone's domain. The BA writes them. The team builds to them. The stakeholders live with them. **The coordinator reads them, watches them, traces them through the project, and notices when something is not quite right.** Your noticing is part of the quality control of the project — and it does not require you to be a business analyst.

## What requirements actually are

Three layers, increasingly true:

- **Shallow:** statements of what the product must do. *The system shall produce monthly reports.*
- **Deeper:** accumulated representations of what stakeholders said they need, mediated by the analysts who made them precise enough to build from. The word "accumulated" matters — requirements emerge over weeks, through interviews and workshops and iteration.
- **Deepest:** **a bet about what people will actually use.** If we build this, will the people for whom we're building it be able to do what they need? The claim is always partly wrong. Some requirements describe things nobody needs. Some real needs aren't in the document. Some language means different things to different readers — like "daily".

This last framing changes how you read. You don't read requirements as a contract. You read them as a hypothesis, and you stay alert for signs the hypothesis is drifting from reality.

## The types that matter

| Type | What it describes | Watch for |
|---|---|---|
| **Functional** | What the system does | Easiest to test. Usually the bulk. |
| **Non-functional** | How well it does it (speed, reliability, security) | Often underspecified. A system that's functional but too slow is unusable. |
| **Business** | The organisational objective the project supports | The "why" behind the "what". Should be traceable from functional → business. |
| **User / stakeholder** | What specific user groups need | Bridge between business and functional. Elicited from actual users. |
| **Data** | Inputs, outputs, storage, formats | Often the real complexity in integration-heavy projects. |
| **Regulatory / compliance** | Legal or policy constraints | Usually non-negotiable. Cannot be traded against scope or cost. |

A good document organises these cleanly. A sloppy one mixes them — putting non-functional constraints inside functional sections, burying regulatory items where they get overlooked. You don't need to be the categoriser. You need to **notice when categories are being blurred**, because blurred categories lead to missed requirements, and missed requirements lead to rework.

## How requirements go wrong

Seven recurring failure modes. Knowing them lets you spot them before they cost you time.

**Ambiguity** — a requirement that can be read multiple ways. The "daily" story was ambiguity. Watch for the landmine words: *timely, user-friendly, secure, robust, fast, intuitive, automated, seamless, real-time, scalable*. When you see them, ask what the specific measurable threshold is.

**Incompleteness** — a requirement that states what must happen but not the edge cases. *The system shall allow users to upload documents.* What file sizes? What types? What happens if the upload fails partway? What if the file is corrupted? Incompleteness produces requirements that look like specifications but leave developers to guess at hundreds of small decisions.

**Conflict** — two requirements that cannot both be met. *Produce reports within five seconds* and *include all transactions for the previous month* may conflict at volume. Requirements documents rarely flag the conflicts; they emerge during build.

**Unstated assumptions** — a requirement that relies on something not explicitly named. *Integrate with the existing customer database* assumes the existing database is stable, accessible, and documented. When the assumption fails, the requirement is functionally unimplementable.

**Wrong level of abstraction** — either too vague (*the system shall be user-friendly*) or too prescriptive (*the login button shall be blue, sixteen pixels by forty, top right*). Good requirements describe what must be true; they don't prescribe how.

**Requirements that describe the current system** — happens when analysts capture user descriptions of existing workflows as requirements for the new one. This produces requirements that automate existing bad processes instead of improving them.

**Requirements that are really solutions in disguise** — *"we need a new field on the claim form for region code"* may or may not solve the underlying problem. The underlying need (segment claims by region) might be met another way. When requirements are expressed as solutions, the team builds the solution without asking whether it's the right one.

You don't have to be a BA to spot most of these. You have to read the document carefully and **notice where your own reading felt uncertain. The uncertainty is the signal.**

## Reading a requirements document critically — three passes

A hundred-page document should take three or four hours of focused time, spread across a few days.

**Pass 1: structural.** Understand the shape. How is it organised? How many requirements? What's the numbering scheme? Glossary? Traceability matrix? This pass tells you how to navigate it later.

**Pass 2: substantive.** Skim the requirements. Build a mental map of what the project is supposed to build. Notice which stakeholders each section serves. Form a sense of scope.

**Pass 3: critical.** Now read for the failure modes. Ambiguous words. Incompleteness. Possible conflicts. Phrases that signal unstated assumptions — *as per current practice, consistent with existing systems, following standard protocols*. These phrases mean something, but the meaning lives in someone's head, not in the document.

Keep a short list as you do the critical pass. Not long — five to ten items on a hundred pages. These are your **watchpoints**.

**The specific move.** When you find an ambiguity, send a short note to the BA. Not an exhaustive analysis. Just:

> *On requirement 4.3.7, "daily reporting" — can you confirm whether we're talking about daily refresh or near-real-time? I can see either reading.*

Two minutes to write. Prevents six weeks of rework. The BA either responds with "yes, it means X, confirmed with the stakeholder" — great, you have closure — or with "huh, good catch, let me check" — even better, you just prevented a failure. **Either outcome is valuable. The cost of sending the note is trivial.**

## Traceability — at the right level

Traceability links requirements to their sources and their implementations. At its simplest: for any requirement, you can answer *where did this come from?* (stakeholder, meeting, business objective) and *where does it show up in the build?* (feature, test case, acceptance criterion).

A project with good traceability can answer questions like: *why are we building this?* and *if we cut this feature, which business requirement is no longer being met?* A project without it cannot resolve scope arguments — *"I thought we were building X" / "no, we agreed Y"* — by reference to evidence.

The discipline is maintained through a traceability matrix. Often hated because it's tedious. Often the first thing to degrade under schedule pressure. You, as coordinator, are often the keeper in practice even when nominally the BA or test lead owns it.

Four practical notes:

- **Do not maintain traceability at the lowest level.** If you have three thousand atomic requirements, you will not maintain a three-thousand-row matrix meaningfully. Aim at the level of requirement groups or user stories. The point is to answer scope questions, not produce paperwork.
- **Keep traceability visible during change requests.** When a change is being scoped, the matrix should be consulted. *Which requirements does this affect? Which objectives does it support? Which tests need updating?* A CR scoped without traceability is a CR whose downstream effects are guesswork.
- **Flag untraceable requirements as risks.** If a requirement exists but cannot be traced to a business objective or stakeholder, that is a signal. Either it was added without justification (scope that may not need to be there) or the traceability is just broken.
- **Use traceability in testing, not just planning.** Test cases should trace to requirements. When a test fails, you should be able to identify which requirement is at risk. *Seventy percent passed* only means something when you know which thirty percent it isn't.

Traceability is unglamorous and one of the places a coordinator makes a disproportionate impact, because most projects do it badly. You don't have to evangelise. You quietly maintain it better than it would otherwise be maintained.

## Requirements flow into everything else

Requirements are not standalone. Understanding the flow helps you see where to pay attention.

- **Into the WBS.** Work packages exist because requirements need implementing. When a requirement is added or removed, the WBS reflects it. WBS work that doesn't trace to a requirement is either overhead (label it) or scope creep (surface it).
- **Into the schedule.** A schedule shows when work packages will complete — which means, indirectly, when requirements will be delivered. A schedule that doesn't show which requirements arrive in which sprint cannot meaningfully inform stakeholders.
- **Into test cases.** Every requirement should have at least one test. A requirement without a test cannot be verified. A test without a requirement is validating something the project didn't commit to deliver.
- **Into acceptance criteria.** Good ACs are traceable to requirements. Bad ACs are either vague (*works as expected*) or inconsistent with the requirements.
- **Into change requests.** A CR is a proposed change to the requirements set. It should explicitly name the requirements being added, modified, or removed — and the downstream WBS items, schedule milestones, test cases, and ACs that need updating.

When you maintain the RAID log, you are often flagging risks that relate to requirements ambiguity or gaps. When you produce a status report, you are reporting on progress against requirements through work packages. When you support change control, you are routing requirement changes through governance.

The practical implication: even though requirements feel like someone else's artefact, they thread through your entire role. Reading them carefully pays dividends across a dozen different tasks.

## The coordinator's specific moves

Week-to-week:

- **Read the requirements document early and thoroughly** — three passes. Produce, for yourself, a short list of watchpoints.
- **Reference requirements in the RAID log.** Risks related to requirements — ambiguity, stakeholder alignment, specification gaps — are among the most consequential on most projects. A RAID with no requirements-related risks is either on a project with impeccable requirements (rare) or on a project where those risks are being overlooked (common).
- **Watch for drift signals.** Stakeholders asking for things not in the document. Team members making assumptions about what the document "really means." Demos where the stakeholder's reaction suggests they expected something different.
- **Support change control by linking changes back to requirements.** A CR that doesn't explicitly identify the requirements being modified is a CR whose impact cannot be fully assessed.
- **Prepare, for each major milestone, a short view of which requirements are being delivered and which are not yet.** Often it's you who produces this.
- **Stay alert to requirements risk during testing.** A defect that's really a requirements problem will keep recurring until the underlying requirement is clarified.
- **Maintain a disciplined archive of requirements changes.** Who requested, why, when, what changed. Six months from now when someone asks *why did we build it this way?*, you should be able to answer with evidence.

## The two failure postures — and the line between them

Two opposite postures both miss the point.

**Self-suppression.** "This is the BA's job, not mine, I would not raise it." The "daily" story. You had the signal. You let it pass because raising it felt like overstepping.

**Overstep.** Rewriting the requirements yourself. Declaring the BA wrong. Proposing to escalate over the BA's head. Positioning yourself as the requirements authority on the basis of a single critical-pass.

The right posture sits between them. You notice. You surface — through the right channel, to the right person, in proportion to what you saw. A short, named clarification note to the BA. A risk entry in the RAID for the things that are live risks, not just clarifications. An item for your PM 1:1 for the things that are governance questions. A flag for the requirements walkthrough for the things that benefit from open discussion. **The noticing is the contribution. The deciding is the PM's and the BA's.**

The chapter's PM line, again, is the anchor: *Surfacing the signal is not interfering with the BA. It is doing your job.*

## Tomorrow, specifically

Five moves for tomorrow.

1. Pull up your project's requirements document (or scope statement, or backlog) and give it a ninety-minute critical pass for the failure modes above. Build your watchpoint list.
2. Take three requirements at random and describe, in your own words, how you would verify each one has been met. If you can't, it's probably ambiguous; note it.
3. Check whether your project has a traceability artefact. If yes, take a recent CR and trace it back to the affected requirements — were the downstream impacts fully identified? If no, raise the question with your PM as help, not critique.
4. Next requirements walkthrough, demo, or review you attend, listen for *I assumed that, I thought we meant, we should probably clarify*. These are the moments the requirements are being pressure-tested. Capture what you hear.
5. Think of one specific thing in your current project that you are not sure the stakeholders and the team have the same understanding of. **One thing.** Send a short note to the BA asking for confirmation. If the answer is "yes, we're aligned" — peace of mind. If the answer is "huh, let me check" — you have just prevented a problem.

The next chapter — the work breakdown structure — begins the procedural heart of the curriculum. The WBS is the bridge between requirements and delivery. Everything in this chapter pays dividends in the next one, because a good WBS cannot be built on requirements that have not been understood.
