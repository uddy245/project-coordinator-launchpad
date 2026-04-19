# GRADE-006: async grading execution

**Milestone:** M4 Grading
**Dependencies:** GRADE-005
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

Grading is slow (~5–15s per call). Blocking the user's upload action on a full grade is bad UX. This ticket makes grading fire-and-forget:

- `createSubmission` (GRADE-003) inserts the row with `status='pending'` and **returns immediately**
- A separate trigger path runs `gradeSubmission`

Two options are acceptable:

**Option A — Next.js route `POST /api/grade/[submissionId]`** called via `fetch` (no-await) at the end of `createSubmission`. Simple, no infra. Risk: serverless function may be killed mid-run if the caller closes — but Vercel's request-independent background execution works if the function handle is kept alive with `waitUntil`.

**Option B — Supabase Edge Function `grade-submission`** triggered by a DB webhook on insert. More robust, but requires Deno port of parts of `src/lib/grading/`.

Start with **Option A** for MVP — simpler to ship, simpler to debug. The full architecture allows a later swap to Option B without API changes.

## Files to create

- `src/app/api/grade/[submissionId]/route.ts` — POST handler calling `gradeSubmission`, uses `after()` so the response returns immediately while the work continues
- Enqueueing call added at the end of `createSubmission`
- `tests/integration/grading-async.test.ts`

## Acceptance criteria

- [ ] `createSubmission` returns within 1 second regardless of grade duration
- [ ] Grading completes and writes rubric_scores within 60 seconds of submission for a normal-sized artifact
- [ ] Failure during grading is logged and sets `status='grading_failed'`
- [ ] Daily cost cap check: if today's Anthropic spend exceeds `ANTHROPIC_SPEND_CAP_USD`, route returns 503 without calling the API and sets submission status to `manual_review`

## Tests required

- [ ] Integration: submit + poll until graded (with mocked Anthropic to make it fast)
- [ ] Unit: cost cap gate

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified end-to-end on preview with a small test submission
- [ ] PR merged
