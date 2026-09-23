# Supabase → Neon migration — touchpoint inventory

Written 2026-09-22 before any application code was changed, on branch
`chore/migrate-supabase-to-neon`. Target Neon project: **pc-launchpad**.

The database itself is already migrated (schema, data, functions, triggers,
`auth.users`, `auth.uid()` shim). **RLS policies were removed and RLS is
disabled**, so every place that relied on a user-scoped Supabase client for
row filtering must now filter explicitly in server code.

## 1. Packages / config

| Item | Where | Notes |
|---|---|---|
| `@supabase/ssr` | package.json | server/browser/middleware clients |
| `@supabase/supabase-js` | package.json | service-role client, types (`User`, `EmailOtpType`) |
| `supabase` CLI (dev) | package.json, `supabase:reset`, `supabase:types` scripts, `scripts/supabase-reset.sh`, `supabase/config.toml` | local stack tooling |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `src/env.ts`, `.env.example`, `tests/setup.ts`, `.github/workflows/ci.yml`, `.github/workflows/calibration.yml`, `src/lib/supabase/*`, `src/app/preview/[slug]/page.tsx`, scripts | anon key + URL shipped to the client bundle |

## 2. Client factories (`src/lib/supabase/`)

| File | Role | Replacement |
|---|---|---|
| `server.ts` | cookie-bound user client (RLS applied as the user) | Drizzle `db` + explicit `user_id` filters; session via Neon Auth |
| `admin.ts` | service-role client (bypasses RLS) | Drizzle `db` (same privileges) |
| `client.ts` | browser client | **unused in `src/`** — delete |
| `middleware.ts` | session refresh + `x-pathname` header | Neon Auth middleware in `src/proxy.ts` |

## 3. Auth (`supabase.auth.*`)

| Call | Files |
|---|---|
| `auth.getUser()` (session check) | `src/lib/auth/require-user.ts`, `src/lib/supabase/middleware.ts`, `src/app/(auth)/reset-password/page.tsx`, `src/app/api/tutor/route.ts`, `src/app/api/tutor/conversations/route.ts`, `src/components/lessons/quiz-panel.tsx`, `src/components/lessons/workbook-panel.tsx`, and every action in `src/actions/*` (access, admin-ai-content, admin-capstones, admin-lessons, admin-scenarios, audit, auth, capstone, checkout, interviews, mock-interview, profile, quiz, submission, submission-status, video-progress, workbook) |
| `auth.signUp` / `signInWithPassword` / `signInWithOtp` / `resetPasswordForEmail` / `updateUser` / `signOut` | `src/actions/auth.ts` |
| `auth.exchangeCodeForSession` | `src/app/auth/callback/route.ts` |
| `auth.verifyOtp` | `src/app/auth/confirm/route.ts` |
| `auth.admin.getUserById` (email lookup) | `src/lib/grading/service.ts`, `src/lib/email/notify-audit.ts` |
| `auth.admin.createUser` / `deleteUser` | `scripts/repro-upload.mjs`, `tests/e2e/helpers/gates.ts`, `tests/integration/*` |
| DB trigger `on_auth_user_created` → `handle_new_user()` (creates `profiles` row, copies `full_name`, `signup_source` from metadata) | `supabase/migrations/20260101_init.sql`, `20260425_signup_source.sql` |

## 4. RPCs (`.rpc(`)

| RPC | Files | Notes |
|---|---|---|
| `is_admin()` (uses `auth.uid()`) | `src/lib/auth/require-user.ts`, `src/app/(app)/layout.tsx`, `src/actions/admin-ai-content.ts`, `admin-capstones.ts`, `admin-lessons.ts`, `admin-scenarios.ts`, `audit.ts`, `tests/integration/profiles-rls.test.ts` | replace with code-side check on `profiles.role = 'admin'` |
| `user_streak(p_user_id)` | `src/app/(app)/dashboard/page.tsx`, `src/app/api/cron/weekly-digest/route.ts` | out-of-band function (not in repo migrations); returns `integer` |
| `search_lessons(q)` | `src/app/(app)/search/page.tsx` | `security invoker`; previously RLS limited it to learners with access |

## 5. Tables / views (`.from(`)

Counts are call sites in `src/`, `scripts/`, `tests/`.

| Table | Sites | Old RLS intent (to replicate in code) |
|---|---|---|
| `lessons` | 41 | published **and** caller `has_access`; admins all |
| `submissions` | 29 | owner read/insert; admins all; writes after submit are system-only |
| `profiles` | 19 | owner read; owner may update **only `full_name`**; admins all |
| `mock_interview_scenarios` * | 18 | published rows readable by signed-in users |
| `quiz_items` | 11 | admin/service only — **`correct` must never reach learners** |
| `mock_interview_responses` * | 11 | owner read/insert/update |
| `workbook_assignments` | 9 | any signed-in user reads; service writes |
| `rubric_scores` | 8 | owner (via submission) reads; admins all |
| `lesson_progress` | 8 | owner read/insert/update |
| `capstone_scenarios` * | 8 | published + `has_access` |
| `capstone_attempts` * | 8 | owner read/insert/update |
| `audit_queue` | 8 | admins only |
| `tutor_messages` | 6 | owner read/insert |
| `rubrics` | 6 | current + `has_access`; admins all |
| `lesson_templates` | 5 | any signed-in user reads |
| `quiz_items_public` (view, `auth.uid()`-filtered) | 4 | projection without `correct`; caller `has_access` |
| `quiz_item_seen` | 4 | owner select/insert/delete |
| `gate_status` | 4 | owner read; admins all |
| `capstone_artifacts` | 4 | owner read; service writes |
| `audit_records` | 4 | admins; owner reads decisions on own submissions |
| `workbook_assignment_seen` | 3 | owner select/insert/delete |
| `prompts` | 2 | admin/service only |
| `quiz_attempts` | 1 | owner read/insert |
| `purchases` | 1 | owner read; webhook writes |
| `learning_activity` * | 1 | owner read |

\* Created out-of-band in prod (not in `supabase/migrations/`). Shapes taken
from the live-DB-derived backfills in the sister repo
(`ba-launchpad/supabase/migrations/20260420_*`, `20260425120000_*`, `20260717_*`).

Schema drift found: `src/app/api/cron/weekly-digest/route.ts` selects
`lesson_progress.completed_at`, which does not exist in any migration or in
the backfills — that query already fails in prod today.

## 6. Storage (`supabase.storage`)

| Bucket | Visibility | Used by | Operations |
|---|---|---|---|
| `submissions` | private, owner prefix `{uid}/…` | `src/actions/submission.ts` | upload |
| `capstone-artifacts` | private, owner prefix | `src/actions/capstone.ts` | upload, remove, `createSignedUrl` |
| `lesson-templates` | public | `src/actions/admin-lessons.ts` | upload, remove, `getPublicUrl` |
| `lesson-videos` (+ `.vtt` captions) | public | `src/actions/admin-lessons.ts`, `scripts/seed-production-video.mjs`, `scripts/seed-all-lesson-videos.mjs`, `scripts/upload-captions.mjs` | upload, `getPublicUrl` |

DB columns holding Supabase Storage URLs/keys: `lessons.video_url`,
`lesson_templates.file_url` (absolute `…supabase.co/storage/v1/object/public/…`
URLs), `submissions.storage_path`, `capstone_artifacts.file_path` (bucket keys).
Also a hard-coded placeholder URL in `src/components/admin/lesson-form.tsx`.

→ Moves to Cloudflare R2 (step 5).

## 7. Scheduled jobs

| Job | Where | Replacement |
|---|---|---|
| pg_cron: delete `tutor_messages` older than 30 days | prod only (not in repo) | Vercel Cron 03:00 UTC → `/api/cron/tutor-retention` (CRON_SECRET) |
| Weekly digest | `vercel.json` → `/api/cron/weekly-digest` | unchanged (data layer migrated) |

## 8. Tests / CI touching Supabase

- Unit tests mocking `@/lib/supabase/*`: `auth-actions`, `checkout-action`,
  `grading-service`, `magic-link-action`, `profile-action`,
  `request-review-action`, `stripe-webhook`, `submission-action`,
  `video-progress-action`, `spend-guard`.
- Integration tests requiring a local Supabase stack (`SUPABASE_RUNNING`):
  `lessons-rubrics-rls`, `portfolio-gate-trigger`, `profiles-rls`, `quiz-rls`,
  `submissions-rls`, `supabase-clients` — these test RLS, which no longer exists.
- E2E helper `tests/e2e/helpers/gates.ts` (service-role client, `auth.admin`).
- CI workflows inject placeholder Supabase env vars.

## 9. Docs referencing Supabase

`CLAUDE.md`, `README.md`, `SETUP.md`, `docs/adrs/0001-stack-choice.md` and
tickets describe the Supabase stack. Only `CLAUDE.md` is updated in this
migration (stack + rules); historical tickets/ADRs are left as-is.
