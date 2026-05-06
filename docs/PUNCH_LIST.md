# PUNCH_LIST.md

Live tracker for what's left to ship the app. **Claude reads this at the
start of every session before doing anything else.** Tick a box when the
work lands on `main`. Add new items as we discover them.

Last reviewed: 2026-05-05 (Part-I grading pipelines complete: Lessons 1–7 fully gradable on main)

---

## Content — grading pipelines (Claude can author next)

- [ ] **Lessons 8–19** — handbook covers Chapters 8–25 (requirements, WBS, schedules, meetings, minutes, status reports, change requests, dashboards, escalation, push-back, chase-or-let-go, political intelligence, stakeholder relationships, vendors, remote work, AI-as-tool). Each chapter is a candidate lesson. Decide which deserve full grading pipelines vs reading-only. Part III of the handbook (Chapters 8–16) is the procedural-artifacts heart of the curriculum and likely needs the most grading-pipeline coverage.

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

**Part-I grading pipelines are complete. Lessons 1–7 are fully gradable end-to-end via the AI grading service. Calibration corpus is 60 fixtures across 7 competencies (35 risk_identification + 5 each for the other 6).**

---

## How to use this file

- **Start of session:** read this first, summarise open items to the user.
- **Picking work:** prefer engine items if user is unavailable for content/verification. If engine is empty, prefer content authoring on existing WIP branches before starting new ones.
- **On merge:** tick the box, move the line to "Recently shipped" with date + PR number.
- **New discoveries:** add to the relevant section as a new unchecked item.
