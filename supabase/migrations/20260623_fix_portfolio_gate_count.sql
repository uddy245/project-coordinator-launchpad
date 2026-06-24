-- ==========================================================================
-- Migration: 20260623_fix_portfolio_gate_count.sql
-- Fixes Gate 2 (Portfolio) on the dashboard.
--
-- LES-010 created gate_status with the note that
-- "portfolio_artifacts_count is refreshed on every submission in M4
-- (GRADE-003)" — but that refresh was never implemented. The column was
-- created at 0 and nothing ever wrote it, so Gate 2 sat at "0 of 7 ·
-- pending" for every learner regardless of how many artifacts they passed
-- (e.g. account 262ce133 had 8 distinct passed lessons but still read 0/7).
--
-- A portfolio artifact = a passed graded submission (distinct lesson).
-- This adds a SECURITY DEFINER trigger that recomputes the count (capped
-- at the per-user target) and portfolio_complete whenever a submission is
-- written, plus a one-time backfill for existing rows.
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
  -- Distinct lessons the learner has a passing submission for.
  select count(distinct s.lesson_id)
    into v_passed
  from public.submissions s
  where s.user_id = v_user and s.pass is true;

  -- Upsert: ensure a row exists, then cap the stored count at the target so
  -- the dashboard never renders "8 of 7".
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

drop trigger if exists submissions_refresh_portfolio_gate on public.submissions;
create trigger submissions_refresh_portfolio_gate
  after insert or update or delete on public.submissions
  for each row execute function public.refresh_portfolio_gate();

-- One-time backfill from existing passed submissions.
update public.gate_status g
  set portfolio_artifacts_count = least(sub.cnt, g.portfolio_artifacts_target),
      portfolio_complete = (least(sub.cnt, g.portfolio_artifacts_target) >= g.portfolio_artifacts_target)
from (
  select user_id, count(distinct lesson_id) as cnt
  from public.submissions
  where pass is true
  group by user_id
) sub
where g.user_id = sub.user_id;

comment on function public.refresh_portfolio_gate() is
  'Recomputes gate_status.portfolio_artifacts_count (distinct passed-submission '
  'lessons, capped at target) + portfolio_complete. Implements the GRADE-003 '
  'refresh that LES-010 documented but never shipped.';
