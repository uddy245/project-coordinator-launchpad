# AUTH-002: Magic link sign-in

**Milestone:** M2 Auth & Checkout
**Dependencies:** AUTH-001
**Estimated session length:** short (≤30 min)
**Status:** not started

## Context

Add a "Send me a magic link" option on the login page. Uses `supabase.auth.signInWithOtp`. The callback route at `/auth/callback` exchanges the token for a session and redirects the user to `/dashboard` (or the `redirect` query param).

## Questions to resolve before starting

- [ ] Should the magic-link flow create accounts for new emails, or require prior signup? Default: allow create (matches Supabase default).

## Files to create

- `src/app/auth/callback/route.ts` — OAuth/OTP exchange route handler
- `src/app/auth/auth-code-error/page.tsx` — error page for invalid/expired links
- Modify `src/components/auth/login-form.tsx` — add magic-link button + "check your email" success state
- Modify `src/actions/auth.ts` — add `sendMagicLink` action
- `tests/e2e/magic-link.spec.ts` — smoke test

## Acceptance criteria

- [ ] Entering an email and clicking "Send magic link" triggers a Supabase email and shows a success state
- [ ] Clicking the link lands on `/auth/callback` and then redirects to `/dashboard`
- [ ] Expired or invalid links redirect to `/auth/auth-code-error` with a clear message
- [ ] The callback preserves the `redirect` query param if present

## Tests required

- [ ] E2E: smoke test that clicking the magic-link button shows a "check your email" success state (we don't intercept emails in CI)

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified by actually sending + clicking a magic link on preview deploy
- [ ] PR merged
