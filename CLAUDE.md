# CLAUDE.md — Project Coordinator Launchpad

You are working on the Project Coordinator Launchpad, an AI-powered training
app that takes users from zero to hire-ready as a Project Coordinator via
video lessons, graded artifacts, and a calibrated AI grading pipeline.

## Stack
- Next.js 16 (App Router) with TypeScript — note: Next.js 16 renamed `middleware.ts` → `src/proxy.ts` with a named export `proxy` (not `middleware`)
- Supabase (Postgres + Auth + Storage + Edge Functions) via `@supabase/ssr`
- Tailwind + shadcn/ui
- Anthropic Claude API (Sonnet 4.5 for grading, pinned model version)
- Stripe Checkout for payments
- Vercel for hosting, Bunny Stream for video, PostHog for analytics, Sentry for errors
- pnpm as package manager

## Repo map
- `src/app/` — Next.js routes (marketing, auth, app, admin route groups)
- `src/components/` — React components, grouped by domain (not by layer)
- `src/lib/` — business logic (supabase, stripe, anthropic, grading, gates)
- `src/actions/` — server actions (thin; delegate to lib)
- `supabase/migrations/` — SQL migrations, source of truth for schema
- `supabase/functions/` — Edge Functions (Deno runtime)
- `docs/tickets/` — tickets, one per file, source of truth for what to build
- `docs/prompts/` and `docs/rubrics/` — versioned AI prompts and rubrics
- `docs/adrs/` — Architectural Decision Records
- `tests/` — unit, integration, e2e

## Commands you run
- `pnpm dev` — start dev server
- `pnpm test` — run unit + integration tests (Vitest)
- `pnpm test:e2e` — run Playwright E2E (starts dev server)
- `pnpm typecheck` — tsc --noEmit
- `pnpm lint` — ESLint + Prettier
- `pnpm build` — production build
- `pnpm supabase:reset` — wipe local DB, apply migrations, apply seed

## Non-negotiable rules
1. Use the simplest possible approach. Resist premature abstraction.
2. Before declaring ANY ticket done, run `pnpm typecheck` AND `pnpm test`. Both must pass.
3. Server-side auth uses `supabase.auth.getUser()`, NEVER `getSession()`.
4. Every new table gets RLS enabled in the same migration, with explicit policies.
5. Every schema change is a new migration file in `supabase/migrations/`. Never edit an existing migration that has been applied.
6. Every prompt or rubric change is a new version (new file). Flip `is_current` in the DB; never edit the old file.
7. Server actions return `{ ok: true; data } | { ok: false; error; code }`. No throws.
8. Never commit secrets. `.env.local` is gitignored. Check before every commit.
9. Commit after every passing test or logical step. Don't batch a session into one commit.
10. If a ticket is ambiguous, stop and ask in the PR description under `## Blocking question`. Don't guess.
11. All env access goes through `import { env } from "@/env"`. Never use `process.env` directly.

## Testing
- Unit tests live in `tests/unit/` and target `src/lib/`.
- Integration tests live in `tests/integration/` and run against a local Supabase instance.
- E2E tests live in `tests/e2e/` and cover the critical user paths.
- Every new server action needs at least one unit test.
- Every new table needs RLS integration tests.
- Every new lesson page gets at least a smoke E2E.
- The calibration corpus test (`tests/integration/calibration.test.ts`) must pass on any PR that touches `src/lib/grading/`, `docs/prompts/`, or `docs/rubrics/`.

## Workflow for any ticket
1. Read the ticket file (`docs/tickets/<ID>.md`) fully.
2. Propose a plan (files, tests, patterns, questions). Wait for approval.
3. Write failing tests first.
4. Implement to make tests green.
5. Run `pnpm typecheck` and `pnpm test`. Fix anything.
6. Commit with a meaningful message.
7. Open PR with the acceptance criteria as a checklist.

## Where to look first
- What are we building next? → `docs/tickets/` (sorted by milestone)
- Why is the stack this way? → `docs/adrs/0001-stack-choice.md`
- How does grading work? → `src/lib/grading/service.ts` + `docs/prompts/grade-raid-v1.md`
- Where is the schema? → `supabase/migrations/` (read files in order)
- Where do environment variables come from? → `src/env.ts` and `.env.example`

When in doubt, read the ticket, read CLAUDE.md, read the relevant ADR. Don't guess.
