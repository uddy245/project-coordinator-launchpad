-- ==========================================================================
-- Migration: 20260103_fix_profiles_admin_recursion.sql
-- Ticket: AUTH-004
-- Purpose: Fix infinite recursion in the admin RLS policy on public.profiles.
--
-- The "admins see all profiles" policy in 20260101_init.sql inlines a
-- subquery against public.profiles inside a policy on public.profiles —
-- every evaluation re-enters the same policy chain. Postgres reports
-- "infinite recursion detected in policy for relation profiles" on any
-- SELECT/UPDATE against the table.
--
-- Replace it with a call to public.is_admin(), which is SECURITY DEFINER
-- and bypasses RLS internally.
-- ==========================================================================

drop policy if exists "admins see all profiles" on public.profiles;

create policy "admins manage all profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());
