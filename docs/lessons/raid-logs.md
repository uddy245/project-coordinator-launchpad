# The RAID Log and the Art of Seeing Trouble Early

**By the end of this lesson you can:**

1. Write a risk entry with a trigger, impact, likelihood, owner and mitigation.
2. Tell a risk from an issue, an assumption and a dependency, and move a risk to an issue when it happens.
3. Write a mitigation that is a specific action, not "monitor".
4. Give every entry one named owner and a follow-up date.
5. Keep the log current, so that it shows what changed from week to week.

## A risk you watched but never raised

Picture this. On a capital-markets operations project, the only client-side subject-matter expert who genuinely understood the legacy calculation engine began visibly disengaging in early March. She had moved into a new role within her organisation and, while officially still on the project, was increasingly unavailable. Meetings went unattended. Questions went unanswered for days. No replacement had been identified.

You noticed. You wrote it down — but in a private working file, not on the RAID log. The reason was political discomfort: a reluctance to raise a concern about a named senior person from the client side in the weekly status meeting.

In early May the SME effectively withdrew. The project spent six weeks identifying, briefing, and onboarding a less senior replacement. The schedule slipped five weeks. In the post-mortem, the sponsor asked how the project had not seen this coming.

The lesson is precise. **A risk you have seen but not recorded is not being managed. It is being hidden, even if you don't mean to hide it.** Private monitoring creates the illusion of oversight while preventing the project from taking any real action. Placing a risk on the RAID log is not an accusation of any individual. It is the act of making uncertainty visible so that the project — as a team — can decide how to respond.

## What RAID stands for

RAID is an acronym for four categories tracked together in a single log:

| Letter | Category | What it is |
|---|---|---|
| **R** | **Risks** | Future events that could affect the project. Not yet occurred. Assessed by probability × impact. Mitigated. |
| **A** | **Assumptions** | Things the plan takes as true without verifying them. Should be named, tested, updated. |
| **I** | **Issues** | Conditions that have *already* happened. Present-tense and certain. Need response plans and owners. |
| **D** | **Dependencies** | Inputs the project needs that are outside its direct control. Demand active coordination. |

The defining word for a risk is *might*. The moment a risk materialises, it stops being a risk and becomes an issue — and must be moved.

## What a well-written risk entry contains

Six elements. Miss any of them and the entry is only decoration.

1. **Clear statement** — not a label. *Resource risk* is not a risk; it is a category. Describe what could happen and why.
2. **Trigger** — the sign you can observe that shows the risk is starting to come true. It tells the team when to act.
3. **Likelihood and impact** — Low / Medium / High, honestly rated. Do not adjust the rating to keep people comfortable.
4. **Named owner** — a single individual accountable for monitoring and mitigation. Not "the team."
5. **Mitigation plan** — concrete actions to reduce likelihood or severity. Not intentions — actions.
6. **Review date** (the template's *Follow-up* column) — without one, nobody looks at the entry again. After three months it is only decoration.

A good entry, in about seventy words, looks like:

> *The vendor is short of staff and may deliver the integration plan after the 28 May deadline, which would stop the testing team starting dependent work on 1 June. Trigger: the vendor misses the 14 May draft. Impact: Medium. Likelihood: Medium. Mitigation: weekly check-ins with the vendor lead; if the delay passes one week, drop non-critical testing scope. Owner: Amara Okeke (Programme Director). Next review: 21 May.*

## Why people don't log what they see

Seeing a risk and not recording it is common. The reasons are predictable:

- Political sensitivity — reluctance to name a senior stakeholder
- Fear that raising a risk will be read as assigning blame
- Reluctance to seem negative to the team
- Optimism — a belief that the situation will self-correct
- Competing demands — the intention to log it "next week"
- A desire to wait for more evidence before raising it formally

None of these is a good reason. The RAID log is a professional tool, not a personal judgement. Adding an entry is how the project signals that something deserves collective attention.

## Five disciplines for the coordinator

1. **Raise risks quickly.** Early capture is far cheaper than late capture. The cost of a false alarm is low; the cost of a missed risk is high.
2. **Separate risks from issues rigorously.** When the event has occurred, it is an issue. Move it. An issue filed as a risk implies mitigation still exists.
3. **Be specific.** A vague entry cannot be owned, mitigated, or reviewed. Specificity is the discipline.
4. **Close resolved entries.** Record how they resolved, so the log remains readable and credible over time.
5. **Review regularly with the PM.** Surface stale entries. Confirm named owners are still engaged.

## When to escalate to the sponsor

Not every risk warrants sponsor attention. A risk belongs in the sponsor-facing report when:

- It materially threatens a project objective
- It requires a decision or action beyond the PM's authority
- It introduces exposure the sponsor needs to understand for their own decisions

A risk stays at the project level when the team can manage it, when senior attention would add no value, or when the risk is routine.

Default: surface slightly more than less. Sponsors who are surprised by materialised risks lose confidence in the project management function. Sponsors who are kept informed of real risks calibrate their expectations accordingly.

## The pre-mortem

A practice worth adopting at phase boundaries and before major milestones. A pre-mortem is a thirty-minute exercise in which the team imagines that the current phase has just concluded in failure, then works backward to identify the causes:

> *It is now September. We have missed our milestone. What happened?*

The technique comes from the psychologist Gary Klein ("Performing a Project Premortem", Harvard Business Review, September 2007).

This framing is more productive than abstract risk brainstorming because people reason more effectively about specific failure scenarios than about hypothetical possibilities. A thirty-minute pre-mortem often finds risks that a longer formal workshop misses. Every output goes directly into the RAID log with the usual discipline of specificity, named ownership, and review dates.

## Tomorrow

1. Open your RAID log and identify every risk older than two months that has not been reviewed in the past three weeks. These are stale entries.
2. Find one risk that is real to you but absent from the log — or one that is on the log but described too vaguely to act on. Rewrite it with precision.
3. Confirm every risk entry names a single accountable owner.
4. Confirm every item filed as an issue is genuinely an issue — not a risk that was never reclassified.
5. Run a thirty-minute informal pre-mortem. If it produces no new entries, ask yourself why.
