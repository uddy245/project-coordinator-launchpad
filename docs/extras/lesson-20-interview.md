# Interview Question Bank — RAID / Risk Competency Cluster
## Sample drawn from Handbook Ch 14 + adjacent judgment chapters (17, 18, 20)

This is the format for the post-MVP mock interview panel (Build Plan §16, Weeks 21–28). The MVP doesn't build the interview panel yet, but these questions are best written now while the chapter material is fresh. They slot into the content pipeline for every lesson, and the format below is the candidate format for a future `interview_questions` table.

Each question has: stem, competency target, difficulty, expected answer structure, strong-answer anchor, weak-answer anchor, common traps the interviewer listens for. When the mock interview panel is built, the AI interviewer asks the stem, the candidate responds (voice → transcript), and a grading call against the rubric scores the response.

---

## Data shape (proposed)

```json
{
  "question_id": "INT-RAID-001",
  "lesson_id": "raid-logs",
  "competency_cluster": "risk_management",
  "difficulty": "mid",
  "question_type": "behavioral" | "scenario" | "judgment" | "knowledge",
  "stem": "...",
  "prompt_to_candidate": "...",
  "expected_answer_structure": [...],
  "strong_answer_anchor": "...",
  "weak_answer_anchor": "...",
  "common_traps": [...],
  "follow_up_probes": [...]
}
```

---

## INT-RAID-001 — Behavioral

**Stem:** "Tell me about a time when you noticed a risk on a project that nobody else seemed to be tracking. What did you do with it?"

**Competency cluster:** risk_management + professional_judgment
**Type:** behavioral (STAR-shaped answer expected)
**Difficulty:** entry-level / mid

**What the interviewer is listening for:**

Strong answer structure:
1. Specific situation (what project, what role, what was the risk)
2. How the candidate noticed it (the signal)
3. What they did (ideally: raised it to the PM, logged it on the RAID log, proposed a mitigation)
4. Outcome (what happened, what they learned)

**Strong anchor:**
> "On a data migration project at [X], I noticed one of our client-side SMEs was missing meetings and slow to respond over a couple of weeks. I wasn't sure whether to raise it — she was senior and I didn't want to seem to be flagging her. I mentioned it to my PM in our weekly one-on-one, framed neutrally: 'I've noticed Priya's responsiveness has dropped — I think it might be worth adding as a risk.' My PM agreed. We added it as a risk with a named mitigation owner and a review date. Two weeks later, Priya moved to a different role. Because we'd logged it, we'd already identified a backup SME and briefed him, so the transition cost us about three days instead of three weeks. I learned that raising a risk early is a low-cost move that protects the project, even when it feels politically awkward."

**Weak anchor:**
> "I always track risks on every project I work on. If I see something, I bring it up in the meeting."

**Common traps:**
- Generic STAR with no specifics. Names matter. Dates matter. The "what happened" matters.
- Credit-stealing — "I saved the project." Listen for honest framing: they raised it, the PM and team acted on it.
- No lesson learned — strong candidates name what they took away.
- "I handled it myself" — if the candidate bypassed the PM to fix it alone, that is a judgment red flag.

**Follow-up probes:**
- "Why didn't you just handle it yourself quietly?"
- "How did you phrase the concern to your PM?"
- "What was the review cadence after you logged it?"

---

## INT-RAID-002 — Scenario

**Stem:** "Imagine you've just joined a project. You open the existing RAID log and find that most of the twenty entries are labeled 'risk' but describe things that have clearly already happened — missed deadlines, broken integrations, disengaged stakeholders. The log hasn't been updated in four weeks. What do you do in your first week?"

**Competency cluster:** risk_management + judgment
**Type:** scenario
**Difficulty:** mid

**What the interviewer is listening for:**

Expected answer structure:
1. Diagnostic instinct — the candidate should recognize this as a misclassification + maintenance problem, not a "fill in more entries" problem.
2. Sequencing — first understand the project state, then fix the log, not the reverse.
3. Relational awareness — they don't immediately rewrite someone else's work; they engage the PM.
4. Specific moves — what they would actually do.

**Strong anchor:**
> "First, I wouldn't start editing entries immediately — the log has history and I'm new. I'd spend a couple of days understanding what's live versus what's stale, probably by reading the last several status reports and talking to the PM. Then I'd propose to the PM a cleanup: close the misclassified risks explicitly with notes saying they materialized; open corresponding issues with current mitigation status; flag entries that appear stale for review. I'd do this as a proposal, not unilaterally, because I'm new and I don't know what I don't know. I'd suggest we walk through it in our next one-on-one and make the corrections together the first time, so I learn the pattern and the history. Going forward, I'd propose a weekly RAID review as part of the standing meeting, even if brief."

**Weak anchor:**
> "I would rewrite the whole log to be correct. Then I would send it out to the team for review."

**Common traps:**
- Unilateral action — "I'd fix it myself" suggests poor relational judgment.
- No diagnosis phase — jumping to "fix" without understanding why it's broken.
- Missing the distinction — candidates who don't see the misclassification (risks vs issues) fail on basic competency.
- Overreach — candidates who propose restructuring all project governance in week one.

**Follow-up probes:**
- "What if the PM pushes back and says the log is fine as-is?"
- "What would you say to the team members who wrote the original entries?"

---

## INT-RAID-003 — Judgment

**Stem:** "A stakeholder tells you, firmly, that a particular item you want to add to the RAID log 'isn't really a risk' and asks you not to log it. They have a reasonable-sounding reason. How do you handle it?"

**Competency cluster:** judgment + pushback + professional_identity
**Type:** judgment
**Difficulty:** mid / senior

**What the interviewer is listening for:**

Expected answer structure:
1. The candidate does not immediately capitulate.
2. The candidate does not immediately escalate — they first engage with the stakeholder's reasoning.
3. The candidate has a clear principle: the RAID log is the project's tool, not any one stakeholder's.
4. The candidate names the PM as the appropriate escalation if it cannot be resolved between them.

**Strong anchor:**
> "I'd ask the stakeholder to walk me through their reasoning — sometimes they know something I don't, and I'd rather update my view than push for the wrong reason. If after hearing them out I still think it's a real risk, I'd explain my view — specifically what I've observed, what the impact would be if it materializes, and why I think logging it is lower cost than not logging it. If we disagree, I'd say I want to raise it with the PM before making the call, because the PM owns the log. I wouldn't log it unilaterally in that situation because I want the stakeholder to see that I'm operating in good faith, not going around them. But I also wouldn't drop it — I've seen what silent watching costs on a project and I wouldn't repeat that."

**Weak anchor:**
> "If the stakeholder doesn't want it on the log, I would respect their view and leave it off."

Or:

> "I would log it anyway — the RAID log isn't anyone's to control."

Both are red flags — the first is passive, the second is confrontational without the relational judgment that makes pushback work.

**Common traps:**
- "I would respect their authority" — suggests the candidate can be talked out of professional judgment easily.
- "I would just log it anyway" — suggests the candidate cannot navigate political conversations.
- Missing the PM — strong candidates explicitly name the PM as the tie-breaker.
- Confusing stakeholder with sponsor — if a candidate treats stakeholder pushback and sponsor pushback the same way, they don't understand governance.

**Follow-up probes:**
- "What if the stakeholder is more senior than the PM?"
- "How would your answer change if the stakeholder is a client-side sponsor?"
- "What if the PM tells you not to log it?"

---

## INT-RAID-004 — Knowledge

**Stem:** "Walk me through the elements of a well-written RAID log entry. What specifically does it need to contain, and why does each element matter?"

**Competency cluster:** risk_management (knowledge baseline)
**Type:** knowledge
**Difficulty:** entry-level

**Strong anchor:**

Covers five elements, with a one-sentence reason for each:
1. **Specific description** — not generic ("resource risk") but actual ("named SME disengaging due to competing role"). The reason: vague descriptions don't produce action.
2. **Probability and impact** — for risks specifically. Honest, not politically calibrated. The reason: miscalibrated probabilities lead to misallocated attention.
3. **Named owner** — a person or explicit role, not "the team." The reason: unowned risks don't get worked.
4. **Specific mitigation** — concrete action, not "monitor closely." The reason: vague mitigations signal that no action will actually happen.
5. **Review date** — when the entry will be revisited. The reason: without a review cadence, entries become decoration.

Bonus if candidate mentions: differentiation (R vs I vs A vs D is distinct), traceability (linked to requirements or work packages where relevant), or evidence of updates over time.

**Weak anchor:**
> "A RAID log has risks, assumptions, issues, and dependencies. You put entries in the right category with a description."

Minimal, memorized-from-a-textbook answer — misses the substance.

**Common traps:**
- Confusion between "description" and "title" — candidates who just list titles.
- Missing the "why each element matters" — if they can list the fields but can't say why, they've memorized a template without understanding it.
- "It needs an ID" — technically true but trivially so; listen for whether they mention ID as a minor point or as a primary one.

**Follow-up probes:**
- "What's the difference between a good mitigation and a vague one? Give me an example of each."
- "When is a risk really an issue?"

---

## INT-RAID-005 — Behavioral (pushback variant)

**Stem:** "Tell me about a time when you disagreed with your PM or a senior colleague about a project risk. What happened?"

**Competency cluster:** pushback + judgment
**Type:** behavioral
**Difficulty:** mid / senior

**What the interviewer is listening for:**

1. The candidate has actually disagreed with someone senior — if they say they've never disagreed, either they haven't been on interesting projects or they don't know their own mind.
2. The disagreement was handled professionally — they raised it, they didn't suppress it, they didn't go nuclear.
3. The outcome was honest — they may have been right or wrong, and they should be willing to say either way.
4. They did not keep relitigating after the PM made a call.

**Strong anchor:**
> "On a vendor selection project I thought one of the risks we were logging as medium probability was actually high — I'd seen one of their past engagements and knew their staffing was thin. I raised it with the PM. He'd seen different information and thought medium was fair. I laid out my specifics, he heard them, and we agreed to move it to medium-high and add a specific probe in month two to test. In month two, my read turned out to be partly right — their staffing was thinner than we'd hoped — but not as bad as I'd feared. The PM and I had a good conversation about calibration after that. I appreciated that he took my view seriously and that I got to see where my instinct was accurate and where it was a bit alarmist."

**Weak anchor:**
> "I don't usually disagree with my PM."

Or:

> "I pushed back hard because I was right, and eventually they saw it."

**Common traps:**
- No actual disagreement — suggests either no experience or no self-trust.
- "I was right" throughout — candidates who cannot name a case where their pushback was wrong or partial show poor calibration.
- Escalating past the PM — a red flag unless in an extreme scenario.
- Passive framing — "I noted my concern but deferred" without any actual engagement.

**Follow-up probes:**
- "Was there a time you pushed back and turned out to be wrong?"
- "How did your relationship with the PM change after that conversation?"

---

## INT-RAID-006 — Scenario (pre-mortem)

**Stem:** "Your PM asks you to facilitate a 30-minute pre-mortem at the start of a new project phase. What's your structure for the session?"

**Competency cluster:** facilitation + risk_management
**Type:** scenario
**Difficulty:** mid

**Strong anchor structure:**
1. Framing — explain what a pre-mortem is; the premise ("imagine the phase has just failed").
2. Individual silent reflection — 5 minutes of each person writing down failure modes independently. (Critical for avoiding groupthink.)
3. Round-robin share — each person reads their items; no critique yet.
4. Clustering — group similar failure modes.
5. Prioritization — which are most likely / most impactful?
6. Capture — top items go into the RAID log with owners and mitigations drafted.

Bonus: the candidate mentions that pre-mortems are most effective when psychologically safe — participants need to feel comfortable raising uncomfortable failure modes, including ones that implicate people in the room.

**Weak anchor:**
> "I would ask the team what could go wrong and write down the answers."

Missing structure, missing silent-reflection step, missing capture path into RAID.

**Common traps:**
- Skipping individual silent reflection — this is the step that differentiates pre-mortems from generic brainstorming.
- No capture path — a pre-mortem whose output isn't reflected in the RAID log is ceremony.
- Treating it as a risk workshop — they're related but different; brainstorming vs. reverse-engineering from imagined failure.

---

## INT-RAID-007 — Judgment (silent risk)

**Stem:** "You've been quietly tracking something in your own notes for two weeks that you think is a real risk, but you haven't added it to the project's RAID log. What should you do, and why did you hesitate in the first place?"

**Competency cluster:** judgment + self-awareness
**Type:** judgment / self-reflection
**Difficulty:** senior

**What the interviewer is listening for:**

This is partly a self-awareness test. Strong candidates admit the hesitation and name why — typically politics, uncertainty, or not wanting to seem alarmist. They then explain why the right move is to log it, and describe the specific way they would raise it.

**Strong anchor:**
> "I'd add it to the log today. The hesitation is usually one of three things — I'm not sure yet and don't want to be alarmist, the risk touches someone senior and feels like an accusation, or I'm just busy. None of those is a good reason. The worst outcome of logging it is that I close it in two weeks with a note saying it didn't materialize — cost: a few minutes. The worst outcome of not logging it is that it does materialize, the project is surprised, and my notebook contains the evidence that I knew. I've made that mistake before. I would raise it to my PM first, frame it neutrally, and log it with a named owner and a specific review date. If I was genuinely uncertain whether it was a risk at all, I'd say that: 'I'm not sure about this one but I'd rather have it on the log and close it if it turns out to be nothing.'"

**Weak anchor:**
> "I'd log it if I was sure. If I wasn't sure I'd keep watching."

**Common traps:**
- No self-awareness about why they hesitated. Candidates who deny they would ever hesitate are either lying or haven't been on projects where the politics were real.
- "I'd log it and tell the sponsor directly" — escalation past the PM.
- "I'd keep watching until I was sure" — reproduces the exact failure pattern the lesson is built around.

---

## INT-RAID-008 — Knowledge (differentiation)

**Stem:** "Here are four statements about a project. Tell me which is a risk, which is an issue, which is an assumption, and which is a dependency. Explain your reasoning."

Prompt to candidate (read one by one):
1. "The vendor missed its last two weekly deliverables."
2. "The client's legal team approves the contract by May 15."
3. "The data migration will take four weeks based on historical patterns."
4. "If the API team loses its lead, integration will slip by three weeks."

**Competency cluster:** risk_management (knowledge baseline)
**Type:** knowledge
**Difficulty:** entry-level

**Expected answers:**
1. Issue — already happened.
2. Dependency — the project needs approval from an external-to-team party.
3. Assumption — a forecast based on unverified historical pattern; if the pattern doesn't hold, the plan is wrong.
4. Risk — conditional future event with probability and impact.

**Strong anchor:** correctly classifies all four with one-sentence reasoning per item.

**Weak anchor:** confuses assumption and dependency (common), or categorizes #1 as a risk despite the past-tense framing.

**Common traps:**
- Treating #3 as a dependency ("depends on historical patterns") — close but wrong; it's an assumption, because no external party is owed anything.
- Treating #4 as an issue ("because losing him is the issue") — confusing the conditional with the actuality.

---

## How these feed the mock interview panel (§16 post-MVP)

When the panel is built, the typical session includes:
- 2 knowledge questions (competency baseline — fast signal on whether the candidate knows the material)
- 2 behavioral (past experience — signal on how they've actually handled things)
- 2 scenario (how they would handle situations they may not have seen yet)
- 2 judgment (how they think about tradeoffs)

For the RAID lesson, the panel draws 8 questions covering all four types. The AI interviewer can randomize across the question bank so repeat candidates get different questions.

Grading the candidate's response to these questions uses the same tool-use pattern as artifact grading (§8.2), with a different rubric tuned to each question type. The rubric dimensions for interview responses are distinct from artifact rubrics but follow the same 1–5 anchored structure.

---

## Scaling to the other 45 lessons

Each handbook chapter has material for 6–10 interview questions following this exact template. The judgment chapters (17–20) are particularly dense — each could produce a full 10-question bank on its own, cross-lesson because judgment competencies transfer.

Pattern for a content producer:
1. Read the chapter, specifically the failure stories and the "when to..." sections.
2. Draft 4 scenarios (situations the chapter describes), 2 behavioral (drawn from the opening story pattern), 2 knowledge (the core concepts), 2 judgment (the tradeoff moments).
3. For each, write the strong and weak anchors based on the chapter's voice.
4. Identify the common traps from your own experience reading what junior coordinators get wrong.

~2 hours per 10-question lesson bank at practiced speed. 46 lessons × 2 hours = ~92 hours of question-bank production — cheap relative to video and calibration corpus.
