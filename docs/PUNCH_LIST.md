# PUNCH_LIST.md

Live tracker for what's left to ship the app. **Claude reads this at the
start of every session before doing anything else.** Tick a box when the
work lands on `main`. Add new items as we discover them.

Last reviewed: 2026-06-08 (Lesson 13 Status Reports grading pipeline shipped; Lessons 1–13 fully gradable on main)

---

## Content — grading pipelines (Claude can author next)

- [ ] **Lessons 14–19** — handbook covers Chapters 14–25 (change requests, dashboards, escalation, push-back, chase-or-let-go, political intelligence, stakeholder relationships, vendors, remote work, AI-as-tool). Each chapter is a candidate lesson. Decide which deserve full grading pipelines vs reading-only. Part III of the handbook (Chapters 9–16) is the procedural-artifacts heart of the curriculum and likely needs the most grading-pipeline coverage.

## Content — blocked on user (recording / authoring)

- [ ] **Lesson 20 real video** — record the RAID-logs video, upload to Bunny Stream, set `lesson.video_url`, flip `is_published=true`. (Note: SESSION_STATE flagged that the placeholder Big Buck Bunny URL was never actually set; `video_url` is currently NULL on Lesson 20.)
- [ ] **Lessons 1–7 real videos** — confirm whether each lesson's `video_url` points to a real recorded video or a placeholder. Recordings needed for any placeholders.
- [ ] **Capstone real case study** — replace placeholder Meridian with a real case + required-artifacts definition + grading rubric. Files: `src/app/(app)/capstone/`, `capstone_scenarios` table.
- [ ] **Lesson 20 video script review** — Jennifer Chen story uniqueness check + read-aloud runtime check. File: `docs/scripts/lesson-20-raid-logs.md`.
- [ ] **Workbook templates per lesson** — Lesson 20 has an XLSX RAID template; Lessons 1–7 grade `.docx` memos but no starter templates exist. Decide whether each lesson ships a template or learners write from scratch.

## Production launch readiness

- [ ] **Stripe live mode** — currently in test mode. Switch to live keys + live product when ready to take real payments.
- [ ] **Bunny Stream account** — not configured. Required before real videos go live.
- [ ] **Resend email domain** — currently using default `onboarding@resend.dev`. Verify a real sender domain.
- [ ] **Sentry DSN populated in prod** — wired but `SENTRY_DSN` may be empty in Vercel.
- [ ] **PostHog key populated in prod** — `NEXT_PUBLIC_POSTHOG_KEY` similarly may be empty.
- [ ] **Marketing / landing page** — confirm whether a public-facing landing + pricing page exist.
- [ ] **First real users / pilot cohort** — 7 lessons now gradable end-to-end; run with 3–5 real learners before opening signups widely.
- [ ] **Customer support flow** — how do learners report a bad grade or broken upload?
- [ ] **Terms of service + privacy policy** — required before taking payments and storing user data + uploaded artifacts.
- [ ] **Backup / data retention policy** — Supabase has automatic backups but no documented retention policy.

## Engine work (Claude can do solo)

_All known engine items shipped._

---

## Recently shipped

- 2026-06-08 — **PR #82** merged: Lesson 13 (Status Reports — Three Audiences, Three Reports / Ch 13) grading pipeline. 5 fixtures (novice_01 / intermediate_01 / hire_ready_01 / loyal_lieutenant_01 / status_rewriter_01). All `status_report_craft` cells held first calibration run — `loyal_lieutenant_01` (new color-washing-defender failure-mode shape, `rag_courage_and_calibration` floored at 1 by prompt cap) held without widening; `status_rewriter_01` audit-vs-rewrite caps held as predicted from Lessons 9–12 (all 5 dims pre-set at {2, ±2}). CI calibration 31m0s under the 45-min cap (corpus now 90 fixtures across 14 competencies). Lessons 1–13 now fully gradable end-to-end.
- 2026-06-06 — **PR #81** merged: Lesson 12 (Minutes, Actions, Decisions / Ch 12) grading pipeline. 5 fixtures (novice_01 / intermediate_01 / hire_ready_01 / format_pedant_01 / minutes_rewriter_01). All `minutes_discipline` cells held first calibration run — `format_pedant_01` (new cosmetic-thoroughness-while-missing-substance failure-mode shape) held without widening; `minutes_rewriter_01` audit-vs-rewrite caps held as predicted from the Lesson 9–11 learning (all 5 dims pre-set at {2, ±2}). Both pre-existing known flakes hit again (`professional_communication/hire_ready_01` score≥3-without-quote + `organisational_navigation/wrong_escalation_01/failure_mode_diagnosis`), green on rerun — 2nd recurrence each, not yet at the 3rd-occurrence widen threshold. CI calibration 36m47s under the 45-min cap (corpus now 85 fixtures across 13 competencies). Lessons 1–12 now fully gradable end-to-end.
- 2026-06-05 — **PR #80** merged: Lesson 11 (Running Meetings / Ch 11) grading pipeline. 5 fixtures (novice / intermediate / hire_ready / status_quo_defender_01 / meeting_rewriter_01). 4 of 5 green first calibration run; `meeting_rewriter_01 / meeting_design_judgment` widened {1, 1} → {2, 2} — Claude reads the v2 rewrite's embedded structural redesign as design judgment, same audit-vs-rewrite shape as Lessons 9–10 (other coverage dims held at their pre-set {2, 2}). `status_quo_defender_01` (new failure-mode shape) held first try. Pre-existing flake on `professional_communication / hire_ready_01` (score≥3 without quote) hit 2× before passing — unrelated, worth filing if it recurs. Also bumped calibration CI `timeout-minutes` 30 → 45 (corpus is now 80 fixtures across 12 competencies; local run took 31 min, CI green at 29m46s). Lessons 1–11 now fully gradable end-to-end.
- 2026-06-03 — **PR #79** merged: Lesson 10 (Schedules, Dependencies, Critical Path / Ch 10) grading pipeline. 5 fixtures (novice / intermediate / hire_ready / green_reassurer_01 / schedule_rewriter_01). All schedule_literacy fixtures green first calibration run; 1 retry needed for an unrelated `organisational_navigation/wrong_escalation_01/failure_mode_diagnosis` transient flake (drifted to 1 vs expected 3 ±1), green on rerun. `schedule_rewriter_01` audit-vs-rewrite caps held as predicted from Lesson 9 learning. Lessons 1–10 now fully gradable end-to-end.
- 2026-06-03 — **PR #78** merged: Lesson 9 (WBS Discipline / Ch 9) grading pipeline. 5 fixtures (novice / intermediate / hire_ready / diagram_polisher_01 / solo_rewriter_01). Two cells on `solo_rewriter_01` widened (hundred_percent_rule_compliance 4→2 tol 1→2; deliverable_orientation 3→2 tol 1→2) — Claude reads the rewrite as inventing rather than auditing and caps both dims hard, the chapter's intended failure mode. Lessons 1–9 now fully gradable end-to-end.
- 2026-06-02 — **PR #77** merged: Lesson 8 (Requirements Literacy / Ch 8) grading pipeline. 5 fixtures (novice / intermediate / hire_ready / self_suppressor_01 / ba_overstepper_01). Two cells widened to tol ±2 (failure_mode_recognition on ba_overstepper, traceability_judgment on intermediate); 1 calibration retry for transient validator flake on an unrelated `lifecycle_awareness` fixture, then green. Lessons 1–8 now fully gradable end-to-end.
- 2026-06-02 — **PR #76** merged: capstone `rubric_summary` surfaced to learners (kicker-styled panel above Begin/Submit) + `.claude/` added to .gitignore. Reconstructs unstaged WIP lost in the 2026-05-16 reset from `97153fe` (mock-interview rubric_summary thread-through), inferred from code-smell analysis (admin selected `rubric_summary`, learner side didn't).
- 2026-05-03 — **PR #65** merged: F1–F9 platform features (Resend email, Sentry, Gate 1 wiring, lesson builder, public preview, FTS search, daily streaks, mock interviews, capstone scaffolding) + 22 follow-on commits.
- 2026-05-03 — **PR #65 prod smoke test**: deploy verified.
- 2026-05-05 — **PR #66** merged: punch list infra.
- 2026-05-05 — **PR #67** merged: calibration corpus 9 → 20 fixtures.
- 2026-05-05 — **PR #68** merged: mock-interview scenarios 11 → 18; all 9 category × difficulty cells ≥1.
- 2026-05-05 — **Cost-cap prod smoke test** done end-to-end. COST-001 enforcement verified in real life.
- 2026-05-05 — **PR #69** merged: Lesson 1 (coordinator-role / Ch 1) grading pipeline. Calibration green first try.
- 2026-05-05 — **PR #70** merged: Lesson 2 (project-lifecycle / Ch 4) grading pipeline. 4 calibration cycles to settle.
- 2026-05-05 — **PR #71** merged: Lesson 3 (written-voice / Ch 3) grading pipeline. Calibration green first try after CI workflow timeout bump (15→30 min).
- 2026-05-05 — **PR #72** merged: Lesson 4 (mindset / Ch 2) grading pipeline. Includes grading-engine quote-cap bump (500→750). Calibration green.
- 2026-05-05 — **PR #73** merged: Lesson 5 (methodologies / Ch 5) grading pipeline with symmetric partisan-cap probes. Calibration green.
- 2026-05-05 — **PR #74** merged: Lesson 6 (governance / Ch 6) grading pipeline with overstep + blame-narrative probes. 4 calibration cycles + quote-cap bump (750→1500) to settle.
- 2026-05-05 — **PR #75** merged: Lesson 7 (variables / Ch 7) grading pipeline with iron-triangle-zealot + quality-blindspot probes. Calibration green first try (post-rebase).

**Part-I grading pipelines complete + Lessons 8 (Requirements Literacy), 9 (WBS Discipline), and 10 (Schedule Literacy) shipped. Lessons 1–10 are fully gradable end-to-end via the AI grading service. Calibration corpus is 75 fixtures across 10 competencies (35 risk_identification + 5 each for the other 9).**

---

## How to use this file

- **Start of session:** read this first, summarise open items to the user.
- **Picking work:** prefer engine items if user is unavailable for content/verification. If engine is empty, prefer content authoring on existing WIP branches before starting new ones.
- **On merge:** tick the box, move the line to "Recently shipped" with date + PR number.
- **New discoveries:** add to the relevant section as a new unchecked item.
