# ADR 0001 — Stack choice

**Status:** Accepted (backfilled 2026-04-19, pre-dates MVP)
**Context:** initial build of the Project Coordinator Launchpad; solo
indie founder, 8–12 week build window, $749 one-time purchase model.

This ADR was referenced in CLAUDE.md from day one but never written.
Backfilled after MVP to capture the actual reasoning; the stack
itself has not changed since kickoff.

## Decision

| Layer | Choice | Pinned at |
|---|---|---|
| **Runtime + framework** | Next.js 16 (App Router) + React 19 + TypeScript | `next@16.2.4` |
| **Auth + DB + Storage + Edge** | Supabase (Postgres 17, RLS-first) | `@supabase/ssr@^0.5` |
| **Styling + components** | Tailwind + shadcn/ui | — |
| **AI grading** | Anthropic Claude Sonnet 4.5 via tool use | model pinned in env |
| **Payments** | Stripe Checkout (not Elements) | test mode for MVP |
| **Hosting** | Vercel (prod + preview per PR) | — |
| **Video** | Bunny Stream | not configured yet (Big Buck Bunny sample) |
| **Analytics** | PostHog | — |
| **Errors** | Sentry | `@sentry/nextjs@^10` |
| **Package manager** | pnpm | `9.12.0` |
| **Env validation** | `@t3-oss/env-nextjs` (throws, not `process.exit`) | — |
| **Testing** | Vitest 2 (unit/integration) + Playwright (E2E) + jsdom (component, added TEST-001) | — |
| **CI** | GitHub Actions | — |

## Why these, concretely

### Next.js 16 App Router
RSC lets server actions and server components share the same auth
session without a separate API layer. The flip side is learning the
`"use server"` + `revalidatePath` + caching model — which did bite us
(stale dashboard cards from missed `revalidatePath` calls, constants
exported from `"use server"` files breaking the build). We paid those
costs during the build and they're documented as non-negotiable rules
in CLAUDE.md.

Note: Next 16 renames `middleware.ts` → `src/proxy.ts` with a named
`proxy` export (not `middleware`). This caught us once; called out
in CLAUDE.md.

### Supabase
Two things at once: hosted Postgres with RLS, plus email/OAuth auth
baked in. RLS pushed us to make authorization a DB concern, not an
app concern — which means the authorization story is reviewable as
SQL in `supabase/migrations/`, not scattered across route handlers.
The cost: RLS debugging is harder than middleware debugging. The
"admin RLS using `is_admin()` must be SECURITY DEFINER and must not
self-reference the target table" trap bit us once (AUTH-004 post-fix
migration). Worth it on balance.

`@supabase/ssr` gives us the cookie-based session handling we need
for server components. Rule: **always `getUser()`, never
`getSession()`** on the server — `getUser()` verifies the JWT,
`getSession()` trusts the cookie. Called out in CLAUDE.md.

### Claude Sonnet 4.5 with tool use
Tool use with `tool_choice: { type: "tool", name: "..." }` is the
most reliable way to force structured JSON output we've found. We
build the Zod validator from the rubric so Claude can't invent
dimensions. Temperature 0, pinned model, one retry on validation
failure — if Claude still fails twice, the submission goes to
`grading_failed` rather than silently shipping bad scores.

Bumping the model is deliberate: requires a PR that updates
`ANTHROPIC_MODEL` env + the `src/lib/anthropic/pricing.ts` table +
passes the calibration corpus (CAL-002 gate). See ADR-0002.

### Stripe Checkout (hosted), not Elements
For a $749 one-time purchase, hosted Checkout is the right default —
Stripe handles SCA, card forms, localization, and SAQ-A compliance
for us. Elements would only be worth it if we were doing a bespoke
upsell flow we can't express as a Checkout session.

Webhook idempotency via unique `stripe_session_id` on `purchases`
means the webhook can be retried by Stripe any number of times
without double-granting access.

### Vercel
Zero-config Next.js hosting, preview deploys per PR, sane secrets
UI. The one trade-off: preview deploys need a separate Supabase
project (`launchpad-preview`) so preview traffic doesn't pollute
prod data. Haven't set that up yet — preview still points at prod.
Tracked as a follow-up.

### Bunny Stream (not Cloudflare Stream, not Mux)
Cheaper per-minute at our scale, HLS out of the box, signed URLs
for access control. We haven't wired it up yet — MVP uses the
public Big Buck Bunny sample as `lesson.video_url` for testing.
Loose-end tracked in SESSION_STATE.

### PostHog + Sentry
Split because they're best-in-class at different things: PostHog for
product analytics + feature flags + session replay (will matter for
content iteration later); Sentry for error tracking.

### pnpm, not npm / yarn
Faster installs, strict hoisting (fewer "accidentally works" module
resolution bugs), and the monorepo story if we ever need it.
`pnpm-lock.yaml` is the lockfile of record; CI uses
`--frozen-lockfile`.

## What we explicitly did NOT choose

- **Serverless database (PlanetScale, Neon).** Chose Supabase to get
  RLS + auth + storage in one place. Separate DB would mean separate
  auth layer.
- **OpenAI / GPT.** Tool-use reliability was the deciding factor.
  Bunny Stream-equivalent of "no freeform JSON hallucinations" is
  Anthropic's forced tool use.
- **Clerk / Auth0.** Supabase Auth covers our needs; adding Clerk
  would mean two identity stores.
- **tRPC.** Server actions + `revalidatePath` cover the RPC-ish
  surface. tRPC would be another layer with no concrete benefit at
  our current complexity.
- **Nx / Turborepo.** Single-app repo; no monorepo tooling.
- **Drizzle / Prisma.** Migrations are SQL files; the type-safe
  wrapper is `supabase gen types` into `src/types/database.ts`. One
  less dependency with a migration story of its own.

## Consequences

### Good
- Everything was shippable in 8 weeks (FND-001 → GRADE-011).
- Auth + RLS + storage + auth-aware server components form a single
  coherent stack with no cross-boundary serialization work.
- Calibration corpus + pinned model + tool use gives us
  reproducibility in the grading path that matters most.

### Cost
- Learning the Next 16 RSC model cost real time.
- Supabase RLS debugging is slower than middleware debugging; we
  partially mitigate with integration tests that exercise policies.
- Supabase preview separation still pending.
- Bunny Stream still not wired.

## Related

- CLAUDE.md references this ADR as "Why is the stack this way?"
- ADR-0002 depends on the versioning shape Supabase makes possible
  (`is_current` + unique constraints).
- BUILD_PLAN.md was written against this stack.
