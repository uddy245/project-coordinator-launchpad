# Project Coordinator Launchpad

An AI-powered training platform that takes learners from zero to hire-ready as a Project Coordinator — via video lessons, graded assignments, and a calibrated Claude-powered grading pipeline.

**Production:** https://project-coordinator-launchpad.vercel.app

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | Neon Postgres via Drizzle ORM (no RLS — access control in server code) |
| Auth | Neon Auth (managed Better Auth) |
| File storage | Neon Object Storage (S3-compatible) |
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
- A Neon database branch for development (Neon console → Branches), or a local
  Postgres 16+ for tests (`tests/db/build-replica.sh`)

### Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Point DATABASE_URL/DIRECT_URL at a Neon dev branch and fill in the
#    Neon Auth + Neon storage values (see .env.example)

# 4. Start the dev server
pnpm dev
```

Open http://localhost:3000.

### Environment variables

All env vars are validated at startup via `src/env.ts`. See `.env.example` for the full list with descriptions. The minimum required for local dev:

```
DATABASE_URL                 # Neon pooled connection string
NEON_AUTH_BASE_URL           # Neon console → Auth
NEON_AUTH_COOKIE_SECRET      # openssl rand -base64 32
AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   # Neon storage
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
| [`src/db/schema.ts`](src/db/schema.ts) | Drizzle schema, pulled from the Neon DB (`pnpm db:pull`) |
| [`supabase/migrations/`](supabase/migrations/) | Historical SQL migrations from the Supabase era (history + test replica input) |
