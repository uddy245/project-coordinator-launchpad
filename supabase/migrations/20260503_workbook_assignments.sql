-- Workbook assignment refresh — per-lesson scenario briefs.
--
-- The completed-workbook upload + grading pipeline grades against the
-- lesson's competency-bound rubric. The "scenario brief" — the
-- fictional case the learner applies their workbook to — is purely
-- learner-facing context, no impact on grading. That decoupling lets
-- us generate fresh briefs on demand without touching the calibrated
-- rubric.
--
-- Same hybrid pattern as quiz_items: shared pool grows when learners
-- refresh; per-user "seen" history so each refresh shows something
-- new; AI top-up when the unseen pool is empty.

create table if not exists public.workbook_assignments (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  title           text not null,
  brief           text not null,            -- markdown scenario context
  is_default      boolean not null default false,  -- the canonical/seed scenario
  is_ai_generated boolean not null default false,
  generated_at    timestamptz,
  sort            int  not null default 100,
  created_at      timestamptz not null default now()
);

create index if not exists workbook_assignments_lesson_idx
  on public.workbook_assignments (lesson_id, sort);

-- Reads open to authenticated learners. Writes go through the service
-- role (the generator action + admin paste flow).
alter table public.workbook_assignments enable row level security;

drop policy if exists "workbook_assignments: read for authed" on public.workbook_assignments;
create policy "workbook_assignments: read for authed"
  on public.workbook_assignments
  for select
  to authenticated
  using (true);

-- Per-user "seen" history. Used for two things:
--   1. The workbook tab shows the most-recently-seen brief for this user
--      (so they don't lose their place between visits).
--   2. The refresh action filters out already-seen briefs so each click
--      shows something new.
create table if not exists public.workbook_assignment_seen (
  user_id       uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.workbook_assignments(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  seen_at       timestamptz not null default now(),
  primary key (user_id, assignment_id)
);

create index if not exists workbook_assignment_seen_user_lesson_idx
  on public.workbook_assignment_seen (user_id, lesson_id, seen_at desc);

alter table public.workbook_assignment_seen enable row level security;

drop policy if exists "wb_seen: own select" on public.workbook_assignment_seen;
create policy "wb_seen: own select" on public.workbook_assignment_seen
  for select using (auth.uid() = user_id);

drop policy if exists "wb_seen: own insert" on public.workbook_assignment_seen;
create policy "wb_seen: own insert" on public.workbook_assignment_seen
  for insert with check (auth.uid() = user_id);

drop policy if exists "wb_seen: own delete" on public.workbook_assignment_seen;
create policy "wb_seen: own delete" on public.workbook_assignment_seen
  for delete using (auth.uid() = user_id);
