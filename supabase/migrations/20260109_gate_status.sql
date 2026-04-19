-- ==========================================================================
-- Migration: 20260109_gate_status.sql
-- Ticket: LES-010
-- Purpose: One row per has_access user tracking the four hiring gates.
--
-- MVP only populates Gate 2 (Portfolio — "N of 7 artifacts submitted").
-- Gates 1, 3, 4 exist as columns so future tickets can flip them without
-- schema migrations. portfolio_artifacts_count is refreshed on every
-- submission in M4 (GRADE-003). Here we just seed the row structure.
-- ==========================================================================

create table public.gate_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  foundation_complete boolean not null default false,
  portfolio_complete boolean not null default false,
  portfolio_artifacts_count integer not null default 0,
  portfolio_artifacts_target integer not null default 7,
  interview_complete boolean not null default false,
  industry_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.gate_status enable row level security;

create policy "users read own gate_status"
  on public.gate_status for select
  using (auth.uid() = user_id);

create policy "admins manage gate_status"
  on public.gate_status for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger gate_status_set_updated_at
  before update on public.gate_status
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Auto-create a gate_status row whenever a profile's has_access flips to
-- true. SECURITY DEFINER so the trigger can insert regardless of the
-- caller (e.g. the webhook running via service_role — which already
-- bypasses RLS — plus any future UI-based admin grant paths).
-- --------------------------------------------------------------------------
create or replace function public.ensure_gate_status_row()
returns trigger as $$
begin
  if (tg_op = 'INSERT' and new.has_access)
     or (tg_op = 'UPDATE' and new.has_access and not coalesce(old.has_access, false)) then
    insert into public.gate_status (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_ensure_gate_status
  after insert or update of has_access on public.profiles
  for each row execute function public.ensure_gate_status_row();

-- Backfill for existing paid users (incl. the founder's own account).
insert into public.gate_status (user_id)
select p.id
from public.profiles p
left join public.gate_status g on g.user_id = p.id
where p.has_access = true and g.user_id is null;

comment on table public.gate_status is
  'Four-gate progress tracker. Gate 2 (portfolio) is the only one with '
  'real MVP semantics. Rows auto-created when profiles.has_access flips true.';
