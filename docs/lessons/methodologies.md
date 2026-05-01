# Waterfall, Agile, and the Space Between

## The argument that wasn't about methodology

A mid-sized insurance firm wants to replace its customer portal. The scope is well understood. The technology is familiar. The team is experienced. There is no good reason for the project to become a referendum on how we work.

It becomes one anyway.

Six weeks into planning, the lead developer — three years in pure Scrum — informs the PM that he will not participate in *waterfall theatre*. The PMO director, with PRINCE2 roots, replies that organisational standards apply to projects above a certain budget. The argument consumes four weeks of planning and seven separate meetings. Both produce articles defending their position. Both call the other ungovernable, or outdated.

What eventually resolves it — not through anyone's brilliance, but through the slow pressure of the sponsor needing the project to start — is a practical compromise. The development work runs in two-week sprints with a backlog and ceremonies. The overall project keeps its charter, roadmap, budget baseline, risk register, and monthly steering committee. Status reports to the PMO are produced *by the coordinator* from the sprint outputs, in the format the PMO expects.

The two worlds meet at the coordinator's desk. The project delivers on time. **No one writes a case study about it. It is also exactly how most real projects work.**

## Why the debate feels bigger than it is

Methodology arguments are tribal, commercial, and political:

- **Tribal.** People identify with the approach they were trained in. Conversion experiences run deep on both sides.
- **Commercial.** Large consulting industries on each side sell certifications, transformations, and content marketing dressed as analysis.
- **Political.** "We are agile" often means *the development team has authority over delivery cadence.* "We follow the PMO" often means *the PMO controls how work is tracked and reported.* The methodology fight is often a fight about who controls the project, dressed up as a fight about how the project should be run.

As a coordinator, you need to see this clearly. The substance matters — and I'll give you the substance. But a lot of the heat is not about substance.

## The Agile Manifesto — read the source

The 2001 Agile Manifesto is short. Four values, twelve principles. Read it carefully. The four values are stated as **over** — not *instead of*:

> Individuals and interactions **over** processes and tools.
> Working software **over** comprehensive documentation.
> Customer collaboration **over** contract negotiation.
> Responding to change **over** following a plan.

The manifesto does not reject processes, documentation, contracts, or plans. It claims the items on the left are more valuable than the items on the right. This distinction has been lost in much subsequent practice — with dogmatic agile teams refusing to produce *any* documentation on principle, a stance not actually in the manifesto.

## What waterfall actually is

Set aside the caricature. Waterfall is a sequential model in which phases run in order and each phase's outputs feed the next:

> Requirements → Design → Implementation → Testing → Deployment

Each phase has a gate. Moving between phases is a deliberate transition, usually marked by formal acceptance of the previous phase's deliverables.

The defining characteristic is that **change is managed through formal change control**. New requirements that emerge during implementation are not silently absorbed — they go through analysis, costing, and approval by a change control board. The process exists because, in this model, changes late in the lifecycle are expensive — and the discipline is designed to make the cost visible *before* the change is absorbed.

| Where waterfall works | Where waterfall fails |
|---|---|
| Scope is knowable in advance and stable | Scope is genuinely unknowable |
| Cost of mid-flight change is high | Requirements emerge through the work |
| Strong governance is required | Cost of guessing wrong up front is high |
| Construction · infrastructure | Most product development |
| Banking core systems · medical devices | Most research-intensive work |
| Safety-critical software | Novel technology projects |

The common misreading is that waterfall *forbids* change. It does not. It channels change through a specific process. Whether that process is useful or burdensome depends on the project.

## What agile actually is

Agile, at its core, is a set of principles — not a specific set of practices. The principles, stripped down, are about three things:

1. **Short feedback cycles.** Build something small. Show it to people who will use it. Learn. Adjust. Build the next small thing.
2. **Adaptive planning.** Plan at multiple levels of granularity. Two weeks in detail. Three months at higher level. Don't commit to detailed plans for work far enough in the future that you don't yet know what it should be.
3. **Team empowerment.** The people who do the work make most of the decisions about how the work is done.

| Where agile works | Where agile fails |
|---|---|
| Requirements emerge through the work | Scope is genuinely stable & knowable |
| Cost of changing direction is low | Governance requires up-front approvals |
| Team has real autonomy | Delivery has to be all-at-once |
| Product can be delivered incrementally | Team isn't really autonomous |
| Most software / digital products | "Agile" is cover for indiscipline |

> Agile, properly applied, requires *more* discipline than traditional project management — not less.

## Scrum, specifically

Scrum is the most widely adopted agile framework. People often use "agile" and "Scrum" interchangeably, which is wrong but common.

**Three roles**

| Role | Accountable for |
|---|---|
| **Product Owner** | What gets built and in what order. Owns the backlog. |
| **Scrum Master** | The process working — removing impediments, protecting the team. |
| **Development Team** | Building the thing. |

**Three artifacts** — the product backlog (everything that might be built), the sprint backlog (what the team committed to this sprint), and the increment (working output produced).

**Cadence** — fixed-length sprints (typically two weeks) bracketed by sprint planning, daily scrum, sprint review, and sprint retrospective.

That's Scrum. You can read the official Scrum Guide in an hour, and you should — most people's understanding is second-hand and muddled.

### The Scrum-but pattern

Scrum works well when its constraints are *honoured*. The product owner really has authority. The team is really protected during sprints. Retrospectives really produce process changes. Increments really are potentially shippable.

Scrum works badly when its constraints are *ignored* while the ceremonies continue:

- The "product owner" has to escalate every decision to a committee.
- The team is interrupted mid-sprint by urgent requests from senior stakeholders.
- Retrospectives become ritualised complaint sessions with no follow-through.
- The "increment" at the end of each sprint is not actually usable output — it is a progress report dressed as software.

This pattern is so common it has a name: **Scrum-but** ("we do Scrum, *but...*"). As a coordinator, when working with a Scrum team, your job is not to impose your preferred artifacts on them. Your job is to **translate** between their cadence and the rest of the project's cadence.

## The hybrid reality

Most real enterprise projects are hybrid — and the hybrid model is not a failure of methodological purity. It is often the right answer.

The typical pattern: the **overall project** has a charter, business case, high-level plan, budget baseline, risk register, stakeholder plan, and steering committee. All waterfall-shaped. Inside that frame, **specific workstreams** — usually the ones with the most uncertainty — are run with agile practices. Software development in sprints. UX design in cycles. Testing continuous rather than phase-gated.

But procurement still follows a procurement process. Change management still runs structured communications. Stakeholder engagement still happens on a cadence. The project still has to deliver to a deadline.

The skill is in fitting the practice to the work — not in enforcing a single methodology across all work.

## Five common failure modes

1. **Waterfall theatre.** All the artifacts produced — but disconnected from actual work. The schedule exists but isn't used for decisions. The RAID log is updated but no one acts on entries.
2. **Agile theatre.** Sprints, product owners, retrospectives — but none producing real discipline. The backlog is a wishlist. Increments aren't shippable.
3. **Methodology mismatch.** Wrong approach for the work. An exploratory product run as waterfall. A regulatory programme run as Scrum.
4. **Hybrid without translation.** Both worlds running, but no bridge. Agile outputs never aggregate into the project-level narrative. PMO formats never reach the agile team.
5. **Methodology as excuse.** *"We can't give you a deadline because we're agile."* *"We can't accommodate that because we follow the PMO process."* Cover for what are really priority conversations.

## A practical diagnostic — four questions

For any project, ask:

1. **How stable is the scope?** Stable & knowable → lean waterfall. Emergent → lean agile.
2. **How expensive is mid-flight change?** Cheap → agile reduces cost of discovery. Expensive → waterfall reduces risk of rework.
3. **How interdependent is the work?** Self-contained → agile lets the team move fast. Deeply coordinated → waterfall makes coordination explicit.
4. **What governance does the environment require?** Heavy up-front approvals → waterfall-shaped governance regardless of how the delivery work runs. Lightweight → more freedom.

The answers rarely point to *pure* waterfall or *pure* agile. They usually point to a hybrid weighted one way or the other. A software build in a regulated bank — heavy waterfall frame, sprint execution. An exploratory product inside a startup — light waterfall frame, sprint execution everywhere. A construction project — mostly waterfall with iterative practices for design.

> The work drives the answer. Everything else is constraint.

## Your role: translator

Your job, in the middle of all this, is **not to take a side.** It is to make the work visible in whatever format the different parties need.

- If the PMO needs traditional status reports — produce them, from whatever source material the agile team produces.
- If the development team needs sprint autonomy — support that, while translating their outputs upward.
- You are the **Switzerland of methodology.** You do not win converts. You get the work done.

I want to be blunt: do not get pulled into the methodology wars. If a developer tells you waterfall is dead, listen politely and redirect to the work. If a PMO director tells you agile cannot work in your environment, listen politely and redirect to the work. You do not have to agree or disagree. You have to deliver.

This is not cowardice. This is judgment. You are early in your career. You do not have the reputation capital to fight this battle, and you don't need to. The people with actual authority over methodology will resolve it (or not) in ways that have little to do with your opinion. Your job is to make whatever they decide work.

## Tomorrow

1. Ask honestly what methodology your current project actually runs — not what it says it runs. Look at the artifacts. Look at how decisions are made. Look at how change is handled. The gap between official and actual is itself useful information.
2. Identify the translation work that is or isn't happening. If your project is hybrid, who is translating? If no one is, that's often the coordinator's gap to fill.
3. Read the Agile Manifesto. The full text is four sentences and twelve supporting principles — ten minutes. Notice what it actually says, and what it doesn't.
4. If your team uses Scrum, read the Scrum Guide end to end. Short. Will let you see which practices match the framework and which are Scrum-but.
5. The next time you hear a methodology argument, don't pick a side. Listen for what's *really* being argued — control, identity, trust, priority. Name it for yourself.
