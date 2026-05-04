# PUNCH_LIST.md

Live tracker for what's left to ship the app. **Claude reads this at the
start of every session before doing anything else.** Tick a box when the
work lands on `main`. Add new items as we discover them.

Last reviewed: 2026-05-03 (after PR #65 merge)

---

## Content (blocked on user / video production)

- [ ] **Lesson 1 content package** — 7-file bundle (rubric, prompt, scenario, video script, workbook spec, quiz, reading, fixtures) for "project intake". Engine ready to accept it; one mechanical integration PR when delivered.
- [ ] **Lesson 20 real video** — record the RAID-logs video, upload to Bunny Stream, set `lesson.video_url`, flip `is_published=true`.
- [ ] **Capstone real case study** — replace placeholder Meridian with a real case + required-artifacts definition + grading rubric. Files: `src/app/(app)/capstone/`, `capstone_scenarios` table.
- [ ] **Modules M02–M07 content packages** — same 7-file shape as Lesson 20, one per module.

## Engine work (Claude can do solo)

- [ ] **Calibration corpus 9 → 20 fixtures** (BUILD_PLAN §11.4) — ~3 novice, ~4 intermediate, ~2 hire-ready, ~1 edge-case variants. Add under `tests/fixtures/risk_identification/`.
- [ ] **Cost-cap prod smoke test** — temporarily set `ANTHROPIC_SPEND_CAP_USD=0.001` in Vercel preview env, upload, confirm `grading_failed` with code `COST_CAP_EXCEEDED`, revert env.
- [ ] **More mock interview scenarios** — expand beyond the 5 seeded for full Gate 3 coverage. Files: `mock_interview_scenarios` table seeds.

## Verification (user's hands)

- [ ] **Lesson 20 video script review** — Jennifer Chen story uniqueness check across handbook + read-aloud runtime check (target 14 min, likely runs 16–18). File: `docs/scripts/lesson-20-raid-logs.md`. Most detachable section if over: §"The pre-mortem" (10:00–11:15).
- [ ] **Verify Vercel deploy of PR #65** — confirm production at https://project-coordinator-launchpad.vercel.app responds 200 and the new routes (`/preview/*`, `/search`, `/interviews`, `/capstone`, `/admin/lessons`, `/admin/ai-content`) render.

---

## Recently shipped

- 2026-05-03 — **PR #65** merged (commit `4a3a5dd`): F1–F9 platform features (Resend email, Sentry, Gate 1 wiring, lesson builder, public preview, FTS search, daily streaks, mock interviews, capstone scaffolding) + 22 follow-on commits (refresh systems, admin AI review, in-form video upload, schema fixes).

---

## How to use this file

- **Start of session:** read this first, summarise open items to the user.
- **Picking work:** prefer engine items if user is unavailable for content/verification.
- **On merge:** tick the box, move the line to "Recently shipped" with date + PR number + commit SHA.
- **New discoveries:** add to the relevant section as a new unchecked item.
