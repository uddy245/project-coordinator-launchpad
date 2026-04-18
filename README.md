# Project Coordinator Launchpad

An AI-powered training platform that takes learners from zero to hire-ready as a Project Coordinator — via video lessons, graded assignments, and a calibrated Claude-powered grading pipeline.

**Production:** https://project-coordinator-launchpad.vercel.app

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Auth + DB | Supabase (Postgres + Auth + Storage + Edge Functions) |
| AI Grading | Anthropic Claude API (`claude-sonnet-4-5`, pinned) |
| Payments | Stripe Checkout |
| Hosting | Vercel |
| Video | Bunny Stream |
| Analytics | PostHog |
| Error tracking | Sentry |

See [docs/adrs/0001-stack-choice.md](docs/adrs/0001-stack-choice.md) for why these were chosen.

---

## Local setup

### Prerequisites

- Node.js 22+
- pnpm 9.12.0 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker](https://www.docker.com/) (for local Supabase)

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Start local Supabase (Postgres + Auth + Storage)
supabase start

# 4. Apply migrations and seed data
pnpm supabase:reset

# 5. Start the dev server
pnpm dev
```

Open http://localhost:3000.

### Environment variables

All env vars are validated at startup via `src/env.ts`. See `.env.example` for the full list with descriptions. The minimum required for local dev:

```
NEXT_PUBLIC_SUPABASE_URL     # from `supabase status`
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

---

## Running tests

```bash
pnpm test          # unit tests (Vitest)
pnpm test:e2e      # Playwright E2E (auto-starts dev server)
pnpm typecheck     # TypeScript — must pass before any PR
pnpm lint          # ESLint + Prettier
```

---

## Deployment

Vercel is connected to this repo:

- **Production** — every merge to `main` auto-deploys to https://project-coordinator-launchpad.vercel.app
- **Preview** — every PR gets a unique preview URL; Vercel comments it on the PR

Env vars are managed in the Vercel dashboard (or via `vercel env add`). Never commit secrets.

---

## Key docs

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Rules and patterns for Claude Code sessions |
| [`BUILD_PLAN.md`](BUILD_PLAN.md) | Full milestone and ticket roadmap |
| [`docs/tickets/`](docs/tickets/) | One file per ticket — source of truth for what to build |
| [`docs/adrs/`](docs/adrs/) | Architectural Decision Records |
| [`docs/prompts/`](docs/prompts/) | Versioned AI grading prompts |
| [`supabase/migrations/`](supabase/migrations/) | SQL schema — read in order for the full picture |
