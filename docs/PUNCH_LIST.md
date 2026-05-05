# PUNCH_LIST.md

Live tracker for what's left to ship the app. **Claude reads this at the
start of every session before doing anything else.** Tick a box when the
work lands on `main`. Add new items as we discover them.

Last reviewed: 2026-05-05 (Part-I grading pipeline mid-rollout, paused on Anthropic credits)

---

## ⚠️ Blocked on user

- [ ] **Top up Anthropic API credits** — calibration runs hit "credit balance too low" on PRs #71 and #72. Console: https://console.anthropic.com/ → Plans & Billing. ~$30–50 covers all remaining lesson calibrations. Required to verify each new lesson's grader works before merge. (Note: Max plan does NOT cover programmatic API spend — those are separate billing lines.)

## Open PRs (waiting on credits to merge)

- [ ] **PR #71** — Lesson 3 (written-voice / Ch 3): rubric + prompt + 5 fixtures. Code complete; calibration green-light blocked on credits.
- [ ] **PR #72** — Lesson 4 (mindset / Ch 2): rubric + prompt + 5 fixtures + grading-engine quote-cap bump (500→750). Code complete; calibration green-light blocked on credits.

## Open WIP branches (no PR yet)

- [ ] **`feat/lesson-5-methodologies`** — rubric + prompt + scenario authored, 5 fixtures + DB migration + PR pending. Resume by writing the 5 fixtures, applying the migration, opening the PR.

## Content — grading pipelines (Claude can author once credits restored)

- [ ] **Lesson 5 grading pipeline** — methodologies (Ch 5). WIP branch above. Same 5-file pattern.
- [ ] **Lesson 6 grading pipeline** — governance (Ch 6).
- [ ] **Lesson 7 grading pipeline** — variables / scope-schedule-cost (Ch 7).
- [ ] **Lessons 8–19** — handbook covers chapters 8–25 (requirements, WBS, schedules, meetings, minutes, status reports, change requests, dashboards, escalation, push-back, chase-or-let-go, political intelligence, stakeholder relationships, vendors, remote work, AI-as-tool). Each chapter is a candidate lesson. Decide which deserve full grading pipelines vs which are reading-only.

## Content — blocked on user (recording / authoring)

- [ ] **Lesson 20 real video** — record the RAID-logs video, upload to Bunny Stream, set `lesson.video_url`, flip `is_published=true`. (Note: SESSION_STATE earlier flagged that the placeholder Big Buck Bunny URL was never actually set; `video_url` is currently NULL on Lesson 20.)
- [ ] **Lessons 1–7 real videos** — confirm whether each lesson's `video_url` points to a real recorded video or a placeholder. Recordings needed for any placeholders.
- [ ] **Capstone real case study** — replace placeholder Meridian with a real case + required-artifacts definition + grading rubric. Files: `src/app/(app)/capstone/`, `capstone_scenarios` table.
- [ ] **Lesson 20 video script review** — Jennifer Chen story uniqueness check across handbook + read-aloud runtime check (target 14 min, likely runs 16–18). File: `docs/scripts/lesson-20-raid-logs.md`. Most detachable section if over: §"The pre-mortem" (10:00–11:15).
- [ ] **Workbook templates per lesson** — Lesson 20 has an XLSX RAID template; Lessons 1–7 grade `.docx` memos but no starter templates exist. Decide whether each lesson ships a template or learners write from scratch.

## Production launch readiness

- [ ] **Stripe live mode** — currently in test mode (`sk_test_...`, test product). Switch to live keys + live product when ready to take real payments.
- [ ] **Bunny Stream account** — not configured. Required before real videos go live (currently no `BUNNY_STREAM_LIBRARY_ID` / `BUNNY_STREAM_API_KEY` set).
- [ ] **Resend email domain** — currently using default `onboarding@resend.dev`. Verify a real sender domain (e.g. `launchpad@<yourdomain>`) before sending volume.
- [ ] **Sentry DSN populated in prod** — Sentry is wired but `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` may be empty in Vercel; confirm and populate.
- [ ] **PostHog key populated in prod** — `NEXT_PUBLIC_POSTHOG_KEY` similarly may be empty; confirm or populate.
- [ ] **Marketing / landing page** — confirm whether a public-facing landing page + pricing page exist, or whether the app is sign-up-direct.
- [ ] **First real users / pilot cohort** — once 5+ lessons are gradable end-to-end, run with 3–5 real learners before opening signups widely.
- [ ] **Customer support flow** — how do learners report a bad grade or a broken upload? Email? In-app form? Need a path before real users hit issues.
- [ ] **Terms of service + privacy policy** — required before taking payments and storing user data + uploaded artifacts.
- [ ] **Backup / data retention policy** — Supabase has automatic backups but no documented retention policy for learner submissions, rubric_scores, or audit_records.

## Engine work (Claude can do solo)

_All known engine items shipped._

---

## Recently shipped

- 2026-05-03 — **PR #65** merged (commit `4a3a5dd`): F1–F9 platform features (Resend email, Sentry, Gate 1 wiring, lesson builder, public preview, FTS search, daily streaks, mock interviews, capstone scaffolding) + 22 follow-on commits (refresh systems, admin AI review, in-form video upload, schema fixes).
- 2026-05-03 — **PR #65 prod smoke test**: root 200, anon preview 200, auth-gated routes 307→login as expected. Deploy verified.
- 2026-05-05 — **PR #66** merged: punch list infra (CLAUDE.md + docs/PUNCH_LIST.md). Session-start source of truth.
- 2026-05-05 — **PR #67** merged: calibration corpus 9 → 20 fixtures. 11 new failure-mode probes. 3 CI runs to settle scores; 6 expected-score adjustments documented in fixture notes.
- 2026-05-05 — **PR #68** merged: 7 hand-authored mock-interview scenarios filling behavioural-medium/hard, procedural-easy, judgment-easy gaps. Pool 11 → 18; all 9 category × difficulty cells now ≥1.
- 2026-05-05 — **Cost-cap prod smoke test** done end-to-end via Vercel CLI + Supabase MCP. COST-001 enforcement verified in real life.
- 2026-05-05 — **PR #69** merged: Lesson 1 (coordinator-role) grading pipeline. role-understanding rubric, grade-role prompt with job-description-recital + jargon caps, first-week-memo scenario, 5 fixtures. Calibration green first try. Lesson 1 fully gradable.
- 2026-05-05 — **PR #70** merged: Lesson 2 (project-lifecycle) grading pipeline. lifecycle-awareness rubric (Ch 4 four-questions), struggling-project diagnostic scenario, 5 fixtures including the artifact_without_understanding canonical-misdiagnosis probe. 4 calibration cycles to settle. Lesson 2 fully gradable.

---

## How to use this file

- **Start of session:** read this first, summarise open items to the user.
- **Picking work:** prefer engine items if user is unavailable for content/verification. If engine is empty, prefer content authoring on existing WIP branches before starting new ones.
- **On merge:** tick the box, move the line to "Recently shipped" with date + PR number + commit SHA.
- **New discoveries:** add to the relevant section as a new unchecked item.
