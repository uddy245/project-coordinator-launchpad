# AUTH-001: Email/password signup + login

**Milestone:** M2 Auth & Checkout
**Dependencies:** FND-002, FND-004
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

First real feature. User can create an account with email/password via a server action and then log in. Error states (duplicate email, wrong password, weak password) are handled with shadcn toast. This ticket establishes the server-action pattern used by every subsequent mutation in the app.

## Questions to resolve before starting

None — all decisions documented in `BUILD_PLAN.md` section 7 (server action shape) and `CLAUDE.md` rule 7 (`{ ok: true; data } | { ok: false; error; code }`).

## Files to create

- `src/app/(auth)/signup/page.tsx` — signup page
- `src/app/(auth)/login/page.tsx` — login page
- `src/app/(auth)/layout.tsx` — auth layout (centered card)
- `src/components/auth/signup-form.tsx` — client form using react-hook-form + zod
- `src/components/auth/login-form.tsx`
- `src/actions/auth.ts` — `signUp`, `signIn`, `signOut` server actions
- `src/components/ui/toast.tsx`, `sonner.tsx` (via shadcn add) — toast surface
- `tests/unit/auth-actions.test.ts` — input validation tests
- `tests/e2e/auth.spec.ts` — sign up → log out → log in flow

## Acceptance criteria

- [ ] User can create an account and is redirected to `/dashboard`
- [ ] User can log in and is redirected to `/dashboard`
- [ ] User can log out from the dashboard header
- [ ] Duplicate email, wrong password, and weak password return structured error messages via toast
- [ ] Password minimum 8 characters enforced both client-side (form validation) and server-side (action validation)
- [ ] Email is lowercased before storage
- [ ] All server actions return `{ ok: true; data } | { ok: false; error; code }` — no throws

## Tests required

- [ ] Unit: `tests/unit/auth-actions.test.ts` — input validation and error shape
- [ ] E2E: `tests/e2e/auth.spec.ts` — sign up → log out → log in flow

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified on preview deploy
- [ ] PR merged

## Suggested kickoff prompt

```
Read @CLAUDE.md and @docs/tickets/AUTH-001.md. Read @src/lib/supabase/server.ts
and @src/lib/supabase/client.ts so you understand the helpers available.

Do NOT write code yet. Propose a plan covering files to touch, tests first,
the exact zod schemas for sign-up and sign-in, and how errors will map
from Supabase to the action's `{ ok: false; error; code }` shape. Wait.
```
