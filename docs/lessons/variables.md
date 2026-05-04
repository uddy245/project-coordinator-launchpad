# Scope, Schedule, Cost, Quality, Risk — and why it isn't a triangle

## The project that pretended the triangle was real

A loyalty platform for a retail group. Eight-million-dollar budget. Twelve-month deadline tied to a board commitment. The sponsor — group CMO — opens kickoff with a clean statement:

> *"Launch date is non-negotiable. Budget is fixed. Scope is what we agreed. Three corners of the triangle, all fixed. You have to make it work."*

The PM pushes back, carefully: in any project there has to be flex somewhere. If all three are truly fixed, the only way to absorb pressure will be through quality. Quality problems on a customer-facing platform will cost more in the long run than any of the other three. The sponsor says he understands, appreciates the diligence, and that it's the team's job to make it work anyway.

The first four months go well. Then reality arrives — three discoveries that weren't in the plan: a more complex POS integration, a data residency issue, an authentication licensing problem. Each, individually, should have produced a change request. Together, they should have triggered a serious conversation about which constraint to flex.

Instead — because the sponsor had said the three were fixed — the trade-offs were absorbed silently:

- The POS integration work was done by **cutting test scope** for non-core brands.
- The data residency rework was done **on nights and weekends without a change request**.
- The authentication issue was resolved by accepting a **less-secure fallback pattern** the security lead flagged as a medium-term risk but not a launch blocker.

The team launched on time, in budget, with the stated scope. The sponsor was pleased. A case study about successful delivery was written internally.

**Six months later:**

- The authentication shortcut produced a **security incident** — not catastrophic, but $600K in unscheduled remediation.
- The compressed UAT had missed device-specific issues — the mobile app's **crash rate was 4× the company threshold**, and customer satisfaction for the first campaign was meaningfully lower than projected.
- The two non-core brand integrations required a **follow-up project** at $1.2M, funded separately.

**True cost: ~$10.2M, not $8M. True delivery date: ~18 months, not 12.**

The sponsor had moved roles by then. The case study about successful delivery was still on the company intranet.

## The five-variable model

The classical iron triangle has three corners — scope, schedule, cost — with quality drawn passively in the middle. This is not quite wrong. It is taught in a way that **encourages a specific kind of self-deception.**

The real model has five variables:

| Variable | What it is |
|---|---|
| **Scope** | What gets built, what the team will do, what's in the sponsor's head |
| **Schedule** | An estimate, not a promise. Updated as work proceeds. |
| **Cost** | Tracked cost is a subset of true cost. Mind the gap. |
| **Quality** | Six dimensions — and the variable most often cut silently. |
| **Risk** | The variable that moves the others. Names what you don't yet know. |

Three problems with the classical triangle:

1. **Quality is not a passive outcome.** It is a real variable that gets actively, consciously cut to protect the others.
2. **Risk is not represented at all.** Risk is what tells you which of the others is most likely to move.
3. **The model treats variables as static.** They move continuously. Trade-offs are not a single decision at kickoff — they are a series of decisions throughout.

## Scope is three different things

"Scope" is three concepts that people conflate:

- **Product scope** — what the thing being built actually does. Features. Functions. Specs. *("the scope" in a design review)*
- **Project scope** — what the team will and will not do. Data migration? Training? Post-launch support? *("out of scope" in a stakeholder meeting)*
- **Scope in the sponsor's head** — the bundle of unspoken expectations. Career outcomes. Team morale. Board narrative. *("this wasn't what we agreed")*

The three drift apart. A team can deliver the product scope as specified, honour the project scope as documented, and still disappoint the sponsor — because the scope in their head was different. **Depressingly common.**

Three habits for closing the gap:

1. **Pay attention to unstructured moments.** What words does the sponsor use when describing the project to peers, in the SC, in the corridor? Windows into their head.
2. **Take prototype feedback seriously, even when it feels like new scope.** *"X was not in the documented scope; it sounds like it was in your expectations. Let's talk about whether to add it as a change or confirm it's out."*
3. **Be sceptical of fast sign-off.** A scope document signed off after twenty minutes of senior review reflects the PM's understanding, not the sponsor's. **Sign-off is legal cover, not true alignment.**

## Schedule — promise vs estimate

A **promise** is a commitment with consequences. An **estimate** is a forecast based on current information.

New coordinators confuse these routinely. They treat the schedule as a promise, get anxious when reality diverges, avoid updating it because doing so feels like admitting failure.

Four schedule failure modes:

| Failure | What it looks like |
|---|---|
| **Compression** | Plan built backward from a date the sponsor wants. Achievable only under ideal conditions that rarely hold. |
| **Missing dependencies** | Work shows up. External parties, shared resources, decisions yet to be made — don't. |
| **No critical path** | Hundreds of line items. No clarity on which sequence drives the end date. Effort allocated by default. |
| **Zombie scheduling** | Plan exists but isn't used. Day-to-day work is driven by inbox urgency. False comfort that the project is being managed. |

## Cost — tracked vs true

The tracked cost is what shows up in the budget tracker — labour, vendor fees, software, hardware, direct expenses. **The true cost includes all of that, plus things that are usually not tracked:**

- Opportunity cost of internal people working on the project and not on other work
- Productivity loss during change adoption
- Post-launch defect remediation
- Follow-up project cost for deferred scope
- Interest on accumulated technical debt
- Senior people's time consulted, attending committees, participating in governance — usually not charged

A well-run project is honest about these in closeout. A less well-run project reports the tracked cost as the project cost, leaving the sponsor with an inflated sense of efficiency.

When tracking budget-to-actuals, understand that actuals are a subset of true cost. When cost pressure comes into the project, be specific about which costs are being cut. And **watch for costs being absorbed informally** — weekend work without overtime is a real cost in morale, attrition risk, and lower productivity the following week.

## Quality — the silent cut

Quality is not "how good the thing is." It is the degree to which the delivered product **meets the needs it was intended to meet, performs reliably under the conditions it will actually face, and provides a foundation for ongoing use without creating excessive future liability.**

Six dimensions:

1. **Functional** — does it do what it's supposed to do?
2. **Performance** — under load, at speed, with reliability?
3. **Usability** — can the people who'll use it actually use it?
4. **Maintainability** — can someone who didn't build it operate it?
5. **Security** — protected against reasonable threats?
6. **Compliance** — meets regulatory and policy requirements?

A good project explicitly names the quality bar for each dimension. A struggling project does not — and the bar is set by default.

**The problem is that quality cuts usually do not happen consciously. They happen by pressure:**

- Schedule slip → "finish quickly" → cut testing → post-launch defects
- Scope addition without budget → pressure on team time → cut code review → technical debt
- Cost reduction → smaller team → cut documentation → knowledge lost when people leave

These cuts are visible later, often paid by different budgets, which is why they don't show up on the project's closeout.

**Your job as coordinator is to keep quality visible.** When you see testing reduced under pressure, name it in the status narrative as a project risk:

> *"Test coverage for non-core flows reduced to 60% from a planned 85%; this creates a risk of post-launch defects in those flows."*

That sentence turns a silent cut into a named risk that can be discussed.

## Risk — the variable that moves the others

Risk is not a static thing. It is the representation of **what you do not yet know about how much the other four will actually cost.**

Every project plan rests on assumptions. Risks are the assumptions you know might not hold. When a risk materialises, it becomes an issue — and the issue must be absorbed somewhere. The absorption happens through one of the other four variables.

| Risk | Issue when it materialises | Where it gets absorbed |
|---|---|---|
| Vendor capacity | Deliverable slips | **Schedule** |
| Scope ambiguity | New requirement surfaces | **Cost** (via change request) or **Scope** (swap) |
| Technical complexity | Approach must change | **Cost, Schedule** — sometimes **Quality** |

Most RAID logs list risks with impact and likelihood ratings, and no explicit link to which project variable is at risk. **An improvement worth making — even if your template doesn't require it:** for each risk, name which variable it threatens and what the absorption strategy is.

> *"Risk: vendor capacity. If materialises, schedule will absorb unless scope is reduced or alternate vendor engaged. Current mitigation: weekly check-ins, fallback vendor identified."*

This transforms the risk register from a list into an operational tool.

**Watch two things:**

- Is the risk register growing faster than it is shrinking? *Uncertainty is rising.*
- Has the flex in any variable been used up? *The next bad event has nowhere to go.*

## How the variables trade

| Pair | How they trade |
|---|---|
| **Scope ↔ Schedule** | Trades cleanly. More scope → more time. The visible lever in most management discussions. |
| **Scope ↔ Cost** | Within limits. Brooks's Law: adding people to a late project makes it later. |
| **Schedule ↔ Cost** | With significant friction. Compression cost escalates rapidly. |
| **Quality ↔ all three** | Asymmetric. Cuts in the moment look free. The cost arrives later, often higher. |
| **Risk ↔ all of them** | Accepting more risk protects everything in the moment. The cost is paid later — often by someone other than the project. |

A useful mental habit: **when something has to give, ask explicitly *which* variable is giving, and *why* that's the right choice.** If the answer is "quality, implicitly, because we can't flex anything else," you have a conversation to have — with your PM, and through your PM with the sponsor.

## Contingency

Contingency is the explicit flex you build into the project at planning time:

- **Schedule contingency** — buffer days held in reserve, not assigned to specific work
- **Cost contingency** — budget set aside beyond the estimate, released only on real overruns
- **Scope contingency** — explicit identification of lower-priority items that can be dropped if pressure emerges

Good contingency is **proportional to risk**. Routine projects: 10% or less. Significant novelty: 20–30% in cost AND schedule.

Contingency is often contested by sponsors, who see it as padding. The argument for contingency: a plan without it is essentially best-case, and treating best-case as base-case leads to the silent-cut pattern.

**Your job is to keep contingency visible and track its consumption.** A project burning contingency faster than it burns work is a project where contingency is about to run out.

## What the coordinator actually does

You are not the decider on trade-offs. The PM and sponsor are. **You are — often — the person who surfaces the trade-offs and makes them visible.**

1. **Maintain all five variables in the artifacts.** Scope current, schedule reflecting actual progress, cost tracked, quality indicators reported, risk actively managed.
2. **Write status narratives that reflect the truth.** Not just RAG colours. *"Schedule amber due to integration slip, currently absorbed through compressed UAT carrying a quality risk on non-core flows."*
3. **Flag silent cuts.** Quality reductions, weekend work without change requests, scope additions without budget impact analysis. Name it quietly to the PM.
4. **Prepare trade-off conversations.** Impact on all five variables. Options for absorption. Consequences of each. Make the decision easier to make well.
5. **Keep long-term cost of short-term choices visible.** When a quality cut is made to protect a schedule, capture it somewhere. So that when the cost emerges later, it is linked back to the choice that created it.

## Tomorrow

1. Take your current project and write down, honestly, what flex each of the five variables has. Private exercise — sharpens your sense of the project's actual posture.
2. Next time someone says "scope," ask yourself silently which kind they mean — product, project, or sponsor's head.
3. Look at your RAID log. For each risk, ask which of the five variables it threatens. If unclear, rewrite one or two with the affected variable named.
4. Think of the last change request on your project. Which variable absorbed it? Was the absorption explicit or implicit? If implicit, what was the quality or risk cost not surfaced?
5. Read a status report through the lens of *does it tell the truth about all five variables, or only two or three?* If quality or risk are missing, that's a signal about how the project is being managed.
