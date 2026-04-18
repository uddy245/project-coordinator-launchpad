# AUTH-005: User profile page (view + edit name)

**Milestone:** M2 Auth & Checkout
**Dependencies:** AUTH-004
**Estimated session length:** short (≤30 min)
**Status:** not started

## Context

Minimum viable profile — view email, edit full name. Industry track selection deferred (post-MVP, not needed for the RAID lesson).

## Files to create

- `src/app/(app)/profile/page.tsx` — server component reading current profile
- `src/components/auth/profile-form.tsx` — client form
- `src/actions/profile.ts` — `updateProfile` server action
- `tests/e2e/profile.spec.ts`

## Acceptance criteria

- [ ] User can view their email (read-only) and full name
- [ ] User can update full name
- [ ] Update is RLS-enforced (user cannot update another user's profile — verified in integration test via direct API)
- [ ] Form shows success toast on save, error toast on failure
- [ ] Action returns `{ ok: true; data } | { ok: false; error; code }`

## Tests required

- [ ] E2E: `tests/e2e/profile.spec.ts` — update name and verify it persists after reload

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified on preview
- [ ] PR merged
