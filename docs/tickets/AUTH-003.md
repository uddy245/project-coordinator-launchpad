# AUTH-003: Auth gates on `(app)` and `(admin)` route groups

**Milestone:** M2 Auth & Checkout
**Dependencies:** AUTH-001
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

The proxy from FND-002 refreshes the session on every request. This ticket adds route-group-level enforcement: unauthenticated users visiting any `/(app)/*` route are redirected to `/login?redirect=<original>`. Non-admin users visiting `/(admin)/*` get a 404 (not 403 — don't leak the existence of admin). Already-authenticated users visiting `/login` or `/signup` get redirected to `/dashboard`.

Use server-side checks in `layout.tsx` (not middleware) so auth state is read once per navigation and passed down, and so `supabase.auth.getUser()` is used (never `getSession()`).

## Questions to resolve before starting

None — AUTH-004 introduces the `is_admin()` function; the admin gate in this ticket can assume that function exists via a SQL stub if AUTH-004 hasn't merged yet. Coordinate merge order in the PR.

## Files to create/modify

- `src/app/(app)/layout.tsx` — auth check, redirect unauth to `/login?redirect=...`
- `src/app/(admin)/layout.tsx` — admin check via `is_admin()`; return `notFound()` if not admin
- Modify `src/app/(auth)/login/page.tsx` — if session exists, redirect to `/dashboard`
- `src/lib/auth/require-user.ts` — server helper returning the authed user or redirecting
- `tests/e2e/auth-gates.spec.ts`

## Acceptance criteria

- [ ] Unauthenticated user visiting `/dashboard` is redirected to `/login?redirect=/dashboard`
- [ ] After login, user is redirected back to the original URL
- [ ] Non-admin user visiting `/audit` receives a 404
- [ ] Authenticated user visiting `/login` is redirected to `/dashboard` (no going back)

## Tests required

- [ ] E2E: redirect behavior for protected routes, admin 404, auth-redirect-when-already-signed-in

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified on preview
- [ ] PR merged
