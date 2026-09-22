-- ==========================================================================
-- Migration: 20260922_01_refresh_portfolio_gate_skip_deleted_users.sql
-- Target: Neon pc-launchpad (first migration after the Supabase move).
--
-- Bug: deleting an auth.users row that has submissions failed.
--   auth.users delete → FK cascade deletes submissions → the
--   submissions_refresh_portfolio_gate trigger re-inserts gate_status for
--   that user → gate_status_user_id_fkey violation → whole delete rolls back.
--
-- Fix: on DELETE, if the owning user no longer exists (we are inside the
-- cascade), there is nothing to recompute — skip. Every other path is
-- unchanged (body otherwise identical to 20260623_fix_portfolio_gate_count).
-- Idempotent: CREATE OR REPLACE.
-- ==========================================================================

create or replace function public.refresh_portfolio_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_passed int;
begin
  -- Cascade from an auth.users delete: the user row is already gone and
  -- gate_status is being deleted too. Don't resurrect it.
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = v_user) then
    return null;
  end if;

  select count(distinct s.lesson_id)
    into v_passed
  from public.submissions s
  where s.user_id = v_user and s.pass is true;

  insert into public.gate_status (user_id, portfolio_artifacts_count)
  values (v_user, least(v_passed, 7))
  on conflict (user_id) do update
    set portfolio_artifacts_count = least(v_passed, public.gate_status.portfolio_artifacts_target);

  update public.gate_status
    set portfolio_complete = (portfolio_artifacts_count >= portfolio_artifacts_target)
    where user_id = v_user;

  return null;
end;
$$;

comment on function public.refresh_portfolio_gate() is
  'Recomputes gate_status.portfolio_artifacts_count (distinct passed-submission '
  'lessons, capped at target) + portfolio_complete. Skips DELETEs cascading '
  'from an auth.users delete (20260922_01).';
