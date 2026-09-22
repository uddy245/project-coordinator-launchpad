# Supabase → Neon migration report (pc-launchpad)

Branch `chore/migrate-supabase-to-neon`. Updated 2026-09-22 (round 3).
**Not pushed, not deployed, no Vercel env vars changed.** See
`SUPABASE-INVENTORY.md` (before any code changed) and `CONVERSION-GUIDE.md`
(how call sites were converted).

Neon project: pc-launchpad (`snowy-pine-47325372`), us-east-1, Postgres 18,
branch `production` (`br-misty-dream-av85gkim`).

## What changed

| Area | Change |
|---|---|
| Data layer | Drizzle + `@neondatabase/serverless`. `src/db/schema.ts` is generated from Neon (`pnpm db:pull` → `scripts/db-normalize-schema.mjs`); **`pnpm db:pull` against live Neon reports no diff**. Server-only client; no DB credentials in client bundles. |
| Schema drift fixed | `profiles.has_access` defaults to **true** in prod (new sign-ups get access); five indexes; full `auth.users`; the four prod-only tables matched column-for-column. Neon still has the `on_auth_user_created` trigger — the sign-up hook works with it (keeps `signup_source`). App role (`neondb_owner`) owns `auth.users`, so its RLS flag doesn't hide rows. |
| Access control | Every former RLS rule is an explicit filter. Lessons: `canViewLesson` / `visibleLessonsFilter` — **free preview lessons (`is_preview`) are usable by anyone signed in, paid or not**; other published lessons need `has_access`; admins see everything. Owner filters on all user rows; admin paths use `isAdmin()`. |
| Auth | Neon Auth (Better Auth). Same routes/UI. Verified email → linked to the existing `auth.users` id; new users provisioned (replaces the trigger's job). **`/verify-email` takes the emailed code** (`emailOtp.verifyEmail`); sign-up and unconfirmed sign-in go there. Existing learners: one-time "reset password" path (login + forgot-password pages); Neon Auth currently has 0 users, so all 3 existing accounts will use it. |
| Storage | **Neon Object Storage** (S3 API). Buckets created on `production`: `lesson-templates`, `lesson-videos` (public_read), `capstone-artifacts`, `submissions` (private, presigned URLs after an ownership check). Same object paths as Supabase. Public objects served directly; the public_read endpoint returns `Access-Control-Allow-Origin: *` (probed — not in Neon's docs), so captions need no app route. |
| Cron | `/api/cron/tutor-retention` daily 03:00 UTC; weekly digest now also checks `CRON_SECRET` (shared `rejectUnlessCron`, fails closed). |
| DB fix | `db/migrations/20260922_01_refresh_portfolio_gate_skip_deleted_users.sql` — deleting a user with submissions no longer fails. **Applied to Neon** (verified in `pg_proc`). |
| Tests | Replica = exact Neon schema dump (`tests/db/neon-schema.sql`) + `db/migrations/` + minimal seed. Smoke (sign up → submission → read back → second user isolated), identity mapping, preview access, delete-user regression, trigger tests. CI job runs them on Postgres 17 (not yet run on GitHub). |

## Verification (2026-09-22)

typecheck ✓ · lint ✓ · build ✓ (only `/`, 404, auth-error static) ·
tests on rebuilt replica 243/243 ✓ · without DB 219 ✓ (24 DB tests skip) ·
smoke 5/5 ✓ · `pnpm db:pull` vs live Neon: no diff ✓ · e2e lists 21 tests.
Only failure: `calibration.test.ts` — pre-existing (missing
`docs/rubrics/pushback-judgment-v1.json`).

## Env vars (Vercel — set by you)

Add: `DATABASE_URL` (pooled), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`
(≥32 chars), `AWS_ENDPOINT_URL_S3=https://br-misty-dream-av85gkim.storage.c-11.us-east-1.aws.neon.tech`,
`AWS_REGION=us-east-1`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`CRON_SECRET`. Set all four `AWS_*` explicitly — Vercel may inject its own
`AWS_*` values into functions otherwise.
Local/scripts only: `DIRECT_URL`, `E2E_TEST_PASSWORD`.
Remove: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `R2_*` (never set). `GRADE_WORKER_SECRET` stays
(grading worker), no longer used by cron.

## Decisions for Uddy

- New sign-ups currently get paid access by default (prod default = true). Changing this is a one-line migration — not done.

## Still to do before cut-over

1. **Storage credential — done (round 3).** `neonctl env pull -s object-storage`
   (production) wrote the four `AWS_*` values into `.env.local` unprinted;
   endpoint matches. Verified put → get → delete of one object on a throwaway
   branch (deleted afterwards); production untouched.
2. **Storage copy — dry run done, not applied.** Archive: 98 files,
   790.3 MB (16.6% of the 5 GB free limit): lesson-videos 60 (789.8 MB),
   submissions 24, capstone-artifacts 14, lesson-templates 0. All 35
   bucket-relative DB keys are in the archive. 25 URL rewrites
   (`lessons.video_url`, one per published video) Supabase →
   `https://br-misty-dream-av85gkim.storage.c-11.us-east-1.aws.neon.tech/lesson-videos/<slug>/<slug>.mp4`.
   11 old root-level/rollback MP4s (~170 MB) are unreferenced but would be
   copied. `--apply --rewrite-urls` only on Uddy's go.
3. **Auth flows against a live branch — partly done.** On a throwaway branch
   with local `pnpm dev`: pages, route gating and the `/api/auth` proxy work
   (no email sent). The branch's Neon Auth config showed
   `sendVerificationEmailOnSignUp=false`, so sign-up now sends the code
   itself (fixed). Sign-up code, reset and magic link each send an email —
   pending Uddy's choice of address.
4. `tests/db/neon-schema.sql` predates migration 20260922_01 (the replica
   applies `db/migrations/` on top). Re-dump after future migrations.

## Behaviour changes (accepted)

Quiz/workbook/capstone actions require access except on free preview
lessons; learners see "reviewed by human" on their own submissions; app use
requires a verified email; a free preview lesson's graded submission shows
its rubric without purchase; weekly digest "completed" = video + quiz +
artifact done (the old `completed_at` column never existed).

## Pre-existing issues left as-is

- `gradeSubmission` idempotency skips only `graded`/`grading_failed`; two
  overlapping runs on a `grading` row can double-grade.
- `video-progress` comment says monotonic max; code overwrites seconds.
- `calibration.test.ts` fails on main (missing rubric file).
- DB still has `is_admin()` and `quiz_items_public` (use `auth.uid()`); unused.
