# Lesson 20 — Workbook
## For LES-005 (workbook panel) + `public/templates/`

This file contains everything that lives in the Workbook tab of Lesson 20. Four downloadable artifacts are described; each should be produced as an XLSX and placed in `public/templates/`.

---

## Template 1 — Starter RAID Log (empty skeleton)
**File:** `public/templates/raid_log_starter.xlsx`

Single worksheet, headers only, with inline instructions in row 2 (italic, grey) that the learner deletes as they fill in real content.

| ID | Type | Title | Description | Probability | Impact | Owner | Mitigation / Action | Next Review | Status |
|---|---|---|---|---|---|---|---|---|---|
| *e.g. R-001* | *R / A / I / D* | *Short descriptive name* | *1–3 sentences. Specific.* | *H / M / L (risks only)* | *H / M / L* | *Named person or role* | *Concrete action, who, by when* | *Date* | *Open / In progress / Closed* |

Cell-level guidance (use Excel data validation + cell comments):

- **Type column** — dropdown: Risk / Assumption / Issue / Dependency
- **Probability column** — dropdown: High / Medium / Low / N/A (N/A for issues, assumptions, dependencies)
- **Impact column** — dropdown: High / Medium / Low
- **Status column** — dropdown: Open / In progress / Closed / Escalated
- **Owner column** — free text with comment: *"A named person or explicit role. Not 'the team.' Not 'TBD.'"*

Second worksheet: "Living artifact notes" — a free-text log where learners record what changed week over week. This is what produces the `living_artifact_evidence` rubric signal.

---

## Template 2 — Novice-level worked example (score: ~1.5 average)
**File:** `public/templates/raid_example_novice.xlsx`

Based on a *different* scenario (not Meridian) so learners study the form rather than copy the content. Scenario: a small retail loyalty-program rebuild.

| ID | Type | Title | Description | Prob | Impact | Owner | Mitigation | Review | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Risk | Resource risk | Resource availability remains a risk | H | H | Team | Monitor closely | | Open |
| 2 | Risk | Vendor risk | The vendor may not deliver | M | H | PM | Keep in touch with vendor | | Open |
| 3 | Risk | Scope risk | Scope may grow | M | M | PM | Change control | | Open |
| 4 | Risk | Timeline risk | We may slip the timeline | M | H | Team | Work harder | | Open |
| 5 | Issue | Comms | Communication has been difficult | | | PM | Better communication | | Open |

**Annotations displayed on the example** (side panel in the workbook view, or as cell comments):

> "Note what's wrong here. Every entry has the word 'risk' in the title. There are no named owners. 'Work harder' is not a mitigation. No review dates. Item 5 is an 'issue' without any description of what the issue actually is. This is the form of a RAID log with none of the content. A grader (human or AI) scores this around 1–2 on every dimension. You can do better than this in twenty minutes."

**Purpose:** Teaches by counter-example. Learners can see what lazy-but-common output looks like and calibrate their own work against it.

---

## Template 3 — Intermediate-level worked example (score: ~3 average)
**File:** `public/templates/raid_example_intermediate.xlsx`

Same retail loyalty-program scenario, done at intermediate quality. Trimmed for space in this file; the actual XLSX includes 11 entries.

| ID | Type | Title | Description | Prob | Impact | Owner | Mitigation | Review | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Risk | Loyalty data migration complexity | The legacy points balances may not map cleanly to the new schema, especially for accounts with multi-tier history. | M | H | Data lead (Priya) | Build a reconciliation report in week 4 to identify mapping gaps before cutover. | Week 5 | Open |
| R-02 | Risk | Vendor resource turnover | Vendor's lead dev recently gave notice; replacement starts in 3 weeks. | M | M | PM | Request vendor ensure handover time; confirm replacement's experience. | Ongoing | Open |
| R-03 | Risk | App store review delays | iOS review cycle for the new app may take longer than estimated. | L | M | Mobile lead | Submit beta build 2 weeks before go-live to absorb review time. | Week 14 | Open |
| A-01 | Assumption | Existing accounts don't require re-authentication | We're assuming customers don't need to re-enroll at go-live. | | | PM | Confirm with legal in week 4. | Week 4 | Open |
| I-01 | Issue | Ambiguous requirement on partner redemptions | Requirement 4.3.7 could be read two ways; flagged to BA. | | | BA (Anu) | Clarified wording to be confirmed by partner team. | Week 3 | In progress |
| D-01 | Dependency | Marketing launch alignment | Launch campaign timing depends on go-live date. | | | Marketing dir | Confirm at the monthly SC. | Monthly | Open |

**Annotations:**

> "This is competent. Every entry has enough specificity to be actionable — R-01's mitigation names the reconciliation report and a week, R-02 names the actual event (lead dev notice). Not every entry is strong — some mitigations are still soft ('request vendor ensure handover'), some reviews are just 'ongoing,' which isn't really a review date. An AI grader hits this around 3 on most dimensions. Worth submitting; not yet hire-ready."

---

## Template 4 — Hire-ready worked example (score: ~4.5 average)
**File:** `public/templates/raid_example_hire_ready.xlsx`

Same scenario, done at hire-ready quality. 13 entries, plus a populated "Living artifact notes" second worksheet showing week-over-week changes. Partial:

| ID | Type | Title | Description | Prob | Impact | Owner | Mitigation | Review | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Risk | Points-balance mapping gap for tiered accounts | 14% of accounts (~47K) have multi-tier histories that do not map cleanly to the new schema per the 2024-09-12 data profiling report. Cutover without a reconciliation path = visible customer-facing discrepancies at launch. | M | H | Priya Nair (Data lead) | (1) Build reconciliation report by EOW wk4 identifying gaps; (2) agree with Dana (CX) on customer comms template if any accounts need manual correction; (3) assign 2 analyst-days in wk 6 to resolve edge cases. | Wk 5, by Priya | Open |
| R-02 | Risk | Vendor lead dev transition | Orbital's lead dev (Josh Park) gave notice 2025-03-08; replacement (Sam Okafor) starts 2025-03-29 and is less senior. Integration work peaks wks 8–11. | M | M | Orbital PM (with PM Sylvie as escalation point) | (1) Confirm 2 weeks shadow before Josh leaves; (2) commission a 1-page handover doc on integration design by 2025-03-22; (3) reserve 4hrs/wk of senior Orbital tech support through wk 11. | 2025-03-22 (handover doc) then weekly | Open |
| A-01 | Assumption | Customers do not need re-enrollment at go-live | Assumption based on verbal confirmation from legal (Meena, 2025-02-14); not yet in writing. If wrong, we need a comms and re-enroll plan that adds ~6 wks of work. | | | PM (Sylvie) | Secure written confirmation from legal by 2025-03-21; if no confirmation, reclassify as risk R-NEW. | 2025-03-21 | Open |
| I-01 | Issue | Requirement 4.3.7 ambiguity ("real-time" vs "daily-refresh") | Two stakeholder groups hold different interpretations. Already affecting integration design discussions. | | | BA (Anu Sharma) | Decision workshop scheduled 2025-03-19 with both groups + architect; outcome captured as binding requirement note. | 2025-03-19 | In progress |
| D-01 | Dependency | PACE team approval of batch window change | Integration requires a 90-min extension to PACE's nightly batch window, which needs PACE team sign-off + a 6-week lead change request. | | H | Rahul Desai (API lead) + PACE team via CR-2025-041 | CR submitted 2025-03-04; confirmed receipt from PACE ops; escalation to VP of Digital if not approved by 2025-04-15. | 2025-04-15 | Open |

**Living artifact notes (second worksheet):**

> **Week 1 (2025-02-28):** initial RAID drafted. 9 entries.
> **Week 2 (2025-03-07):** R-02 added after vendor notice event. A-03 promoted from assumption to risk after legal flagged concerns. I-01 opened after requirements walkthrough.
> **Week 3 (2025-03-14):** R-05 closed — mitigation successful (test env secured). A-01 still unresolved; review date stands.
> **Week 4 (2025-03-21):** A-01 confirmed in writing — converted to closed assumption with reference to legal email. D-01 escalation path updated after PACE team indicated CR may slip.

**Annotations:**

> "This is what hire-ready looks like. Every risk has all five elements, specific dates, named individuals. Mitigations are concrete and numbered where there are multiple steps. Assumptions are traceable to a source (Meena, 2025-02-14). The living-artifact second sheet shows the log has been *maintained*, not drafted once. An AI grader or a human reviewer reads this as 4.5 on most dimensions. This is the level a real client pays for."

---

## Workbook-panel copy (displayed in the UI)

Above the four templates:

> "Download the starter template. Read the scenario in the tab. Build your own RAID log. The three worked examples are for reference — study them to calibrate what novice, intermediate, and hire-ready look like. Don't copy them; your scenario is different (Meridian Insurance, not a retail loyalty program). When you're ready, switch to the Quiz tab, pass with 8/10 or better, and then come back and upload your artifact for AI grading."

Below:

> "A note on what we grade. The AI grader scores against five dimensions — completeness, differentiation, mitigation realism, ownership, and living-artifact evidence. Each dimension is scored 1–5 with a direct quote from your submission justifying the score. After you see the AI's scoring, you can request human review if you want a second opinion — no penalty, no extra cost."

---

## Notes for content production

- **Excel files:** the three examples must be real XLSXs, not screenshots. Learners need to open them and see the structure.
- **Data validation:** implement the dropdowns in the starter template exactly as described. This is the scaffolding that produces good form in the submission, which produces better content to grade.
- **Accessibility:** XLSX headers should be marked as headers. Worksheet names should be meaningful ("RAID Log" not "Sheet1").
- **Template versioning:** each file has a hidden cell `A1` with a version string (`raid-starter-v1.0`). If the template is revised later, the version bump is visible to graders looking at learner submissions and helps diagnose content questions.
