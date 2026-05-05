# PUNCH_LIST.md

Live tracker for what's left to ship the app. **Claude reads this at the
start of every session before doing anything else.** Tick a box when the
work lands on `main`. Add new items as we discover them.

Last reviewed: 2026-05-05 (after PR #69 — Lesson 1 grading pipeline shipped)

---

## Content (blocked on user / video production)

- [ ] **Lesson 20 real video** — record the RAID-logs video, upload to Bunny Stream, set `lesson.video_url`, flip `is_published=true`.
- [ ] **Capstone real case study** — replace placeholder Meridian with a real case + required-artifacts definition + grading rubric. Files: `src/app/(app)/capstone/`, `capstone_scenarios` table.
- [ ] **Lesson 2 grading pipeline** (PR #70 in flight) — same shape as Lesson 1: rubric + prompt + scenario + 5 fixtures sourced from Chapter 4. Calibration CI polling.
- [ ] **Modules M03–M07 grading pipelines** — same 5-file pattern (rubric + prompt + scenario + 5 fixtures + DB migration), one per module. Source from handbook Chapters 3, 2, 5, 6, 7. (M03 is "written voice" / Ch 3; M04 is "mindset" / Ch 2; etc.)

## Engine work (Claude can do solo)

_All known engine items shipped._

## Verification (user's hands)

- [ ] **Lesson 20 video script review** — Jennifer Chen story uniqueness check across handbook + read-aloud runtime check (target 14 min, likely runs 16–18). File: `docs/scripts/lesson-20-raid-logs.md`. Most detachable section if over: §"The pre-mortem" (10:00–11:15).

---

## Recently shipped

- 2026-05-03 — **PR #65** merged (commit `4a3a5dd`): F1–F9 platform features (Resend email, Sentry, Gate 1 wiring, lesson builder, public preview, FTS search, daily streaks, mock interviews, capstone scaffolding) + 22 follow-on commits (refresh systems, admin AI review, in-form video upload, schema fixes).
- 2026-05-03 — **PR #65 prod smoke test**: root 200, anon preview 200, auth-gated routes 307→login as expected. Deploy verified.
- 2026-05-05 — **PR #66** merged: punch list infra (CLAUDE.md + docs/PUNCH_LIST.md). Session-start source of truth.
- 2026-05-05 — **PR #67** merged: calibration corpus 9 → 20 fixtures. 11 new failure-mode probes (3 novice, 4 intermediate, 2 hire-ready, 2 edge cases). 3 CI runs to settle scores; 6 expected-score adjustments documented in fixture notes.
- 2026-05-05 — **PR #68** merged: 7 hand-authored mock-interview scenarios filling behavioural-medium/hard, procedural-easy, judgment-easy gaps. Pool 11 → 18; all 9 category × difficulty cells now ≥1.
- 2026-05-05 — **Cost-cap prod smoke test** done end-to-end via Vercel CLI + Supabase MCP. Set `ANTHROPIC_SPEND_CAP_USD=0.001` in Preview, deployed fresh preview build, inserted synthetic submission (status=pending), called `/api/grade/<id>` with worker secret. Grade endpoint returned `{ok:false, code:"COST_CAP_EXCEEDED"}`; DB confirmed `submissions.status=grading_failed`. Reverted cap to 100, deleted synthetic submission. COST-001 enforcement verified in real life.
- 2026-05-05 — **PR #69** merged: Lesson 1 (coordinator-role) grading pipeline. role-understanding rubric (5 dims grounded in handbook Ch 1), grade-role prompt with job-description-recital + jargon caps, scenario (first-week memo to PM), 5 fixtures (novice/intermediate/hire-ready/generic-boilerplate/off-topic). Calibration corpus passed first try (no score adjustments needed). Migration applied to launchpad-prod via Supabase MCP. Lesson 1 is now fully gradable.

---

## How to use this file

- **Start of session:** read this first, summarise open items to the user.
- **Picking work:** prefer engine items if user is unavailable for content/verification.
- **On merge:** tick the box, move the line to "Recently shipped" with date + PR number + commit SHA.
- **New discoveries:** add to the relevant section as a new unchecked item.
