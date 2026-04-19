# Lesson 20 — RAID Logs: quiz items v1

10 competency-anchored multiple-choice items. Distribution across the five
rubric dimensions is weighted toward the higher-weight dimensions:

| Dimension                        | Weight | Items in quiz |
| -------------------------------- | -----: | ------------: |
| risk_completeness                |  0.30  |             3 |
| risk_differentiation             |  0.20  |             2 |
| mitigation_realism               |  0.20  |             2 |
| ownership_and_accountability     |  0.15  |             2 |
| living_artifact_evidence         |  0.15  |             1 |

Pass threshold: 8/10. Failing does not block progression in MVP — learners
retake while the submitted artifact remains the primary evidence of mastery.

This file is the source of truth. The DB seed
(`supabase/migrations/20260107_seed_quiz_lesson_20.sql`) mirrors it.

---

### 1. (competency: risk_completeness, difficulty: easy)

**A well-formed risk entry in a RAID log should always include…**

- a) A risk title and an owner
- b) **Trigger, impact, likelihood, owner, and mitigation** ✓
- c) Title, description, and status
- d) A severity score and a due date

Distractor rationales:
- a: Owner is necessary but not sufficient. Without trigger/impact/likelihood/mitigation the risk is not actionable.
- c: Status is a state, not a shape. Missing mitigation and trigger means nobody knows what to do or when it becomes real.
- d: Severity is derived; a 5-field risk has the inputs. A due date alone does not tell the team what the risk *is*.

---

### 2. (competency: risk_completeness, difficulty: medium)

**A junior PC writes: "Risk: System might be slow. Status: Open." What is the single biggest gap preventing this from being actionable?**

- a) No ID number assigned
- b) **No trigger or mitigation, so nobody knows when to act or what to do** ✓
- c) Missing the severity score
- d) Status should be "In progress"

Distractor rationales:
- a: IDs help organization but don't unblock action.
- c: Severity is derivative; the entry has no inputs from which to derive it.
- d: Status labels don't add evidence; the entry still lacks a plan.

---

### 3. (competency: risk_completeness, difficulty: hard)

**You are reviewing a peer's RAID log. Which entry is most complete?**

- a) "R-001 — Risk: Vendor delay. Owner: Vendor PM. Impact: High."
- b) **"R-002 — Risk: Data migration failure at go-live cutover. Trigger: Migration dry-run fails. Impact: 48h rollback window. Likelihood: Medium. Mitigation: Add 24h buffer; rehearse cutover twice; Mark owns execution. Owner: Mark. Follow-up: 2026-05-10."** ✓
- c) "R-003 — Could be issues with training."
- d) "R-004 — High risk, monitor."

Distractor rationales:
- a: Three of five fields; missing trigger and mitigation — the two that move it from diagnosis to action.
- c: A one-liner is not a risk entry; it's a note-to-self.
- d: "Monitor" is the weakest mitigation and no other fields are provided.

---

### 4. (competency: risk_differentiation, difficulty: easy)

**A teammate says "The vendor promised the integration would handle our volume." On a RAID log this is a…**

- a) Risk
- b) Issue
- c) **Assumption** ✓
- d) Dependency

Distractor rationales:
- a: It hasn't happened and isn't probabilistic — it's a statement being taken for granted.
- b: Nothing has broken yet.
- d: A dependency is an external blocker you need from someone else; this is a belief about behavior you've accepted.

---

### 5. (competency: risk_differentiation, difficulty: medium)

**The project's lead developer just announced a planned 4-week leave starting next sprint. On your RAID log this is a…**

- a) Risk (might happen)
- b) **Issue (already real — the leave is scheduled)** ✓
- c) Assumption
- d) Dependency on HR

Distractor rationales:
- a: The event is already confirmed — risks are things that might happen. You mitigate the *consequences* (schedule slip), not the leave itself.
- c: Nothing is being assumed; this is a known fact.
- d: HR isn't blocking anything; the leave is approved.

---

### 6. (competency: mitigation_realism, difficulty: easy)

**Which of these is the best mitigation for "Risk: vendor API may return stale data under load"?**

- a) "Monitor closely."
- b) **"Add cache + contract test suite that fails the build if response schema drifts; on-call rotation for alerts."** ✓
- c) "Escalate."
- d) "Add a bug ticket."

Distractor rationales:
- a: "Monitor" is a posture, not a plan — no owner, no threshold, no action.
- c: Escalate to whom, for what decision?
- d: A ticket is a record of work, not work.

---

### 7. (competency: mitigation_realism, difficulty: medium)

**Why is "Monitor" a weak mitigation on its own?**

- a) **It is too vague — no action, no owner, no threshold** ✓
- b) Monitoring is expensive
- c) It is acceptable for low-likelihood risks
- d) It duplicates the Status column

Distractor rationales:
- b: Cost is beside the point; the issue is specificity.
- c: A weak mitigation is weak regardless of likelihood. Low-likelihood risks still need an action *if* they fire.
- d: Status tracks state; mitigation tracks plan — they are unrelated.

---

### 8. (competency: ownership_and_accountability, difficulty: medium)

**Your RAID log has 12 items. 3 have no owner listed. What does this most likely indicate?**

- a) Those items are low priority
- b) **They are orphans — nobody is accountable, so nothing will move** ✓
- c) The log is correctly using role-based ownership
- d) Those items are not yet real

Distractor rationales:
- a: Priority is unrelated to ownership; a low-priority item still needs someone to close it.
- c: Role-based ownership still requires a role *named* (e.g. "Tech Lead"). Blank means no role, no person.
- d: Real or not, an orphaned item rots.

---

### 9. (competency: ownership_and_accountability, difficulty: easy)

**A follow-up date next to every open item matters because…**

- a) It lets you sort the log
- b) **It turns the log into a living artifact — you can tell this week what's stale** ✓
- c) Auditors require it
- d) Stakeholders won't read it otherwise

Distractor rationales:
- a: Sorting is a byproduct; the purpose is triage cadence.
- c: Auditors vary; the practice stands on its own merits.
- d: Stakeholders read what's relevant; date alone doesn't draw attention.

---

### 10. (competency: living_artifact_evidence, difficulty: easy)

**Which is the strongest signal that a RAID log is a living document rather than a one-off report?**

- a) It has risks, issues, assumptions, and dependencies
- b) It was updated once at kickoff
- c) **Items show status transitions over time (Open → In progress → Mitigated → Closed) and follow-up dates that move** ✓
- d) It was reviewed by the product owner

Distractor rationales:
- a: Having the four categories is structural, not behavioral.
- b: A single update is the opposite of a living artifact.
- d: Review events are a moment; a living log shows movement between moments.
