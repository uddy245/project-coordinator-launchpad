-- ==========================================================================
-- Migration: 20260102_profiles_hardening.sql
-- Ticket: AUTH-004
-- Purpose: Restrict what authenticated users can update on profiles, and
--          backfill profile rows for any auth.users that pre-date the trigger
--          from 20260101_init.sql.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Column-level UPDATE restriction
--
-- The RLS policy "users update own profile" restricts which ROWS a user can
-- update. This adds a COLUMN restriction: authenticated users can only write
-- to `full_name`. `role` and `has_access` are mutated only by:
--   - the `handle_new_user` trigger (SECURITY DEFINER, runs as owner)
--   - the Stripe webhook, using the service_role key (bypasses these grants)
--   - admin tooling, also via service_role
-- --------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- --------------------------------------------------------------------------
-- Backfill
--
-- Any users who signed up before the trigger existed have no profile row.
-- Create one for each, idempotently.
-- --------------------------------------------------------------------------
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
