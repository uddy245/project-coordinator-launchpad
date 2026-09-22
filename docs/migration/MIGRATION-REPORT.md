# Supabase → Neon migration report (pc-launchpad)

Branch `chore/migrate-supabase-to-neon`, 2026-09-22. **Not deployed; no
Vercel env vars changed.** Before touching code, see `SUPABASE-INVENTORY.md`;
for how call sites were converted, see `CONVERSION-GUIDE.md`.

## What changed

| Area | Change |
|---|---|
| Data layer | Drizzle + `@neondatabase/serverless` (`src/db`). Schema **pulled** with `drizzle-kit pull` (never pushed). Server-only client; no DB credentials in client bundles (`server-only` guard; build verifies it). |
| Access control | Every former RLS rule is an explicit filter in server code: owner = session user id; lessons/rubrics/capstones require `has_access`; admin paths gated by code-side `isAdmin()` (replaces `is_admin()`/`auth.uid()` — no `SET LOCAL` needed). |
| Auth | Neon Auth (`@neondatabase/auth`). Same routes/UI. `getSessionState()` links a **verified** Neon Auth email to the existing `auth.users.id`; new users get `auth.users` + `profiles` rows (replaces `on_auth_user_created`). Unverified sessions → `/verify-email`. |
| Existing users | Login + forgot-password pages explain the one-time reset. `sendPasswordReset` creates a Neon Auth login (random password) for pre-migration emails, then sends the reset link → `/reset-password?token=…`. Sign-up with a legacy email is redirected to the reset path. |
| Storage | Cloudflare R2, one private bucket; old bucket names are key prefixes. Public prefixes (videos, templates) served via `/api/files/…` (302 to presigned URL). |
| Cron | `/api/cron/tutor-retention`, daily 03:00 UTC (`vercel.json`), `CRON_SECRET` bearer, runs the 30-day `tutor_messages` delete. |
| Removed | `@supabase/ssr`, `@supabase/supabase-js`, `supabase` CLI, `src/lib/supabase/*`, `supabase/config.toml`, `NEXT_PUBLIC_SUPABASE_*`. RLS-only integration tests deleted. |
| Tests | Smoke test (`tests/integration/neon-smoke.test.ts`): sign up → create submission → read back → second user gets nothing / NOT_FOUND → unpaid user blocked. Identity-mapping and trigger tests. All run against `tests/db/build-replica.sh` (local copy of the Neon state). New CI job runs them on Postgres 17. |

## Env vars (Vercel — set by you, not changed here)

Add: `DATABASE_URL` (pooled), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
(≥32 chars), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET`, `CRON_SECRET`.
Local/scripts only: `DIRECT_URL` (unpooled; `pnpm db:pull`, scripts),
`E2E_TEST_PASSWORD` (authed e2e spec).
Remove: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (keep the last two only for the one-off storage copy).

## Not migrated / must be done before cut-over

1. **Schema verified against a local replica, not Neon itself.** No Neon
   credentials were available. Run `DIRECT_URL=… pnpm db:pull` against
   pc-launchpad and diff `drizzle/schema.ts` with `src/db/schema.ts` —
   especially the out-of-band tables (`mock_interview_*`, `capstone_*`,
   `learning_activity`, `lessons.is_preview/search_text`).
2. **Storage objects are not copied.** Run
   `scripts/migrate-storage-to-r2.mjs` (dry-run first, then
   `--apply --rewrite-urls`). Until then existing videos, templates,
   submissions and capstone files are missing. Add an R2 CORS rule for the
   app origin (captions `<track crossOrigin>`).
3. **Neon Auth settings:** app URL as a trusted origin; email verification
   and password-reset emails enabled; magic-link enabled (otherwise the magic
   link button returns an error). Flows are tested against mocks only.
4. **Weekly digest auth mismatch (pre-existing):** the route checks
   `Bearer GRADE_WORKER_SECRET`, but Vercel Cron sends `Bearer CRON_SECRET`.
   Left unchanged; set both to the same value or switch the route to
   `CRON_SECRET`.
5. Weekly digest read `lesson_progress.completed_at`, which never existed
   (query failed in prod). Now: completed = video + quiz + artifact done;
   "this week" = `updated_at` ≥ 7 days ago (approximate).

## Behaviour changes to review

- Quiz/workbook/capstone actions now require `has_access` (the old
  service-role code skipped it; RLS intent required it).
- Learners now see the "reviewed by human" state on their own submissions
  (RLS previously hid `audit_queue` from them).
- App access requires a verified email (Supabase confirmation parity).
- Old Supabase email links: recovery → `/forgot-password`, others → error page.
- `scripts/repro-upload.mjs` and `scripts/supabase-reset.sh` retired.

## Pre-existing issues found (not fixed)

- `refresh_portfolio_gate` trigger: deleting an `auth.users` row with
  submissions fails (cascade re-inserts `gate_status` → FK error).
- `gradeSubmission` idempotency skips only `graded`/`grading_failed`; two
  overlapping runs on a `grading` row can double-grade.
- `video-progress` comment says monotonic max; code overwrites seconds.
- `calibration.test.ts` fails on main: `docs/rubrics/pushback-judgment-v1.json` missing.
- DB still has `is_admin()` and `quiz_items_public` (depend on `auth.uid()`); unused now.
