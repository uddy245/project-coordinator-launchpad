# Supabase → Neon migration report (pc-launchpad)

Branch `chore/migrate-supabase-to-neon`. Updated 2026-09-23 (round 4).
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
| Auth | Neon Auth (Better Auth). Same routes/UI. Verified email → linked to the existing `auth.users` id; new users provisioned (replaces the trigger's job). **`/verify-email` takes the emailed code** (`emailOtp.verifyEmail`); sign-up and unconfirmed sign-in go there. Existing learners: one-time "reset password" path (login + forgot-password pages); Neon Auth currently has 0 users, so all 3 existing accounts will use it. **Magic link replaced by "Email me a sign-in code"** (`/login/code`, `signIn.emailOtp` completed in a server action) — Neon Auth magic links can't complete in this cross-domain setup (see below). |
| Logging / Sentry | Next.js dev logs Server Function arguments (incl. passwords) — turned off (`logging.serverFunctions: false`); production never logged them (verified). One shared Sentry scrubber for server/edge/browser: drops request bodies, redacts password/token/code/otp/secret keys at any depth. |
| Storage | **Neon Object Storage** (S3 API). Buckets created on `production`: `lesson-templates`, `lesson-videos` (public_read), `capstone-artifacts`, `submissions` (private, presigned URLs after an ownership check). Same object paths as Supabase. Public objects served directly; the public_read endpoint returns `Access-Control-Allow-Origin: *` (probed — not in Neon's docs), so captions need no app route. |
| Cron | `/api/cron/tutor-retention` daily 03:00 UTC; weekly digest now also checks `CRON_SECRET` (shared `rejectUnlessCron`, fails closed). |
| DB fix | `db/migrations/20260922_01_refresh_portfolio_gate_skip_deleted_users.sql` — deleting a user with submissions no longer fails. **Applied to Neon** (verified in `pg_proc`). |
| Tests | Replica = exact Neon schema dump (`tests/db/neon-schema.sql`) + `db/migrations/` + minimal seed. Smoke (sign up → submission → read back → second user isolated), identity mapping, preview access, delete-user regression, trigger tests. CI job runs them on Postgres 17 (not yet run on GitHub). |

## Verification (2026-09-23)

typecheck ✓ · lint ✓ · build ✓ (only `/`, 404, auth-error static) ·
tests on rebuilt replica 249/249 ✓ (incl. smoke) · `pnpm db:pull` vs live
Neon: no diff ✓ (round 2) · e2e lists 21 tests.
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

## Live auth verification (throwaway branches, local `pnpm dev`)

All flows ran against the app's real server actions on throwaway branches
of `production` (all deleted; only `production` remains). Test emails went
to example.com addresses or Uddy's Gmail plus-addresses, one at a time.

| Flow | Result |
|---|---|
| Sign-up → emailed code → verify | ✓ `uddyoguagha+pctest1@gmail.com`: code verified, auto signed in, `/dashboard` 200, one `auth.users` + one `profiles` row. One code per sign-up (Neon sends it; our extra send was removed — it caused two emails). |
| Password reset | ✓ token flow; old password rejected, new one works. |
| Legacy learner one-time reset | ✓ reset provisions the Neon Auth login; sign-up with a legacy email is refused; after reset + code, linked to the original `auth.users` id. |
| Unconfirmed sign-in | ✓ fixed: now "confirm your email" + one fresh code (SDK reports Neon's `EMAIL_NOT_VERIFIED` as `email_not_confirmed`). |
| Magic link | ✗ **Neon Auth magic links can't complete in this cross-domain setup**: Neon verifies the link but never issues the session-challenge cookie the app needs (neither from a server action nor via `/api/auth` from the browser), so no session. **Replaced by email sign-in code.** |
| Email sign-in code | ✓ `uddyoguagha+pctest2@gmail.com`: code → session → `/dashboard` 200, one `auth.users` + one `profiles` row. Works on any device. |

Neon Auth stores verification codes and magic-link tokens hashed; password
reset tokens are readable (used for the no-inbox reset test). The Neon
console still has the Magic Link plugin enabled — unused now; can be turned off.

## Still to do before cut-over

1. **Storage copy — dry run done, not applied.** Default mode copies only
   DB-referenced files: **85 files, 613.6 MB (12.9% of the 5 GB free limit)**
   — 25 lesson videos + their 25 caption `.vtt` files (the player derives
   them from the video URL), 21 submissions, 14 capstone artifacts. Skipped,
   staying in the zip: 13 files, 176.7 MB (10 old rollback videos, 3
   submission files no DB row references). 25 URL rewrites (`lessons.video_url`)
   Supabase → `https://br-misty-dream-av85gkim.storage.c-11.us-east-1.aws.neon.tech/lesson-videos/<slug>/<slug>.mp4`;
   all 35 DB-referenced private files present. `--apply --rewrite-urls` only
   on Uddy's go.
2. `tests/db/neon-schema.sql` predates migration 20260922_01 (the replica
   applies `db/migrations/` on top). Re-dump after future migrations.

Done in earlier rounds: storage credential (`neonctl env pull -s
object-storage`, verified put/get/delete on a throwaway branch).

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
