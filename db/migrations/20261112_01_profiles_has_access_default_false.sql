-- ==========================================================================
-- Migration: 20261112_01_profiles_has_access_default_false.sql
-- Target: Neon pc-launchpad. NOT APPLIED. Review, run on a branch first,
-- then production. Needs the owner's decision first (see below).
--
-- New sign-ups must not get the paid program for free.
--
-- profiles.has_access was created with DEFAULT false
-- (supabase/migrations/20260101_init.sql). Production drifted to DEFAULT
-- true, and the Neon copy kept it (docs/migration/MIGRATION-REPORT.md:
-- "new sign-ups get access"). The on_auth_user_created trigger and
-- provisionAppUser() both insert the profile without has_access, so every
-- new account gets the default: full access, no purchase button, and
-- createCheckoutSession() answers "You already have access".
--
-- This changes the default only. EXISTING ROWS ARE NOT TOUCHED: everyone who
-- has access today keeps it. Whether accounts that never paid should keep
-- access is a separate decision for the owner. To see them (read-only):
--
--   select count(*) from public.profiles p
--   where p.has_access and p.role <> 'admin'
--     and not exists (select 1 from public.purchases pu where pu.user_id = p.id);
--
-- After applying: run `pnpm db:pull` so src/db/schema.ts shows default(false),
-- and refresh tests/db/neon-schema.sql.
-- Idempotent. Roll back: alter column has_access set default true.
-- ==========================================================================

begin;

alter table public.profiles alter column has_access set default false;

commit;
