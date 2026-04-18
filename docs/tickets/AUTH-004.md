# AUTH-004: `profiles` table and auto-create trigger

**Milestone:** M2 Auth & Checkout
**Dependencies:** AUTH-001
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

`auth.users` is managed by Supabase. We mirror a subset into `public.profiles` via a trigger (`handle_new_user`) that fires on insert into `auth.users`. This is where `has_access`, `role`, and (post-MVP) `industry_track` live. RLS is enabled from day one.

## Questions to resolve before starting

None — schema defined in `BUILD_PLAN.md` section 6.

## Files to create

- `supabase/migrations/20260102_profiles.sql` — table, RLS policies, trigger, `is_admin()` function
- `tests/integration/profiles-rls.test.ts` — RLS policies

## Schema (for the migration)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'learner' check (role in ('learner', 'admin')),
  has_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- users read their own profile; admins read all
-- users update their own profile (full_name only — restricted via column grants or separate UPDATE policy)

create function public.is_admin() returns boolean ...
create function public.handle_new_user() returns trigger ...
create trigger on_auth_user_created after insert on auth.users ...
```

## Acceptance criteria

- [ ] Signing up creates a row in `public.profiles`
- [ ] Profile has `has_access=false` by default
- [ ] Profile has `role='learner'` by default
- [ ] RLS: users can SELECT their own profile; admins can SELECT all
- [ ] RLS: users can UPDATE their own profile; cannot change `role` or `has_access`
- [ ] `public.is_admin()` returns true for users with `role='admin'`, false otherwise
- [ ] Migration applied cleanly to local Supabase (`pnpm supabase:reset`)

## Tests required

- [ ] Integration: `tests/integration/profiles-rls.test.ts` — user A cannot read user B's profile; admin can; user cannot escalate role

## Definition of done

- [ ] Acceptance criteria checked
- [ ] Migration reviewed for idempotency (can run twice)
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
