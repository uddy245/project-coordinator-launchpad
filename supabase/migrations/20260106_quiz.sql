-- ==========================================================================
-- Migration: 20260106_quiz.sql
-- Ticket: LES-006
-- Purpose: Multiple-choice quiz storage for lessons.
--
-- Key invariant: the `correct` column on public.quiz_items must NEVER
-- be readable via the anon key. We achieve this with:
--   1. RLS on quiz_items that blocks authenticated SELECT entirely.
--   2. A SECURITY DEFINER view `quiz_items_public` that projects every
--      column EXCEPT correct + distractor_rationale, filtered to only
--      return rows for lessons the caller can access.
--   3. Grading runs via a server action using the service_role client,
--      which reads the base table directly.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- quiz_items — the full row including the correct answer
-- --------------------------------------------------------------------------
create table public.quiz_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  sort integer not null,
  stem text not null,
  options jsonb not null,             -- [{id:'a', text:'...'}, ...]
  correct text not null,              -- 'a'|'b'|'c'|'d'
  distractor_rationale jsonb not null, -- { a:'...', b:'...', c:'...', d:'...' }
  competency text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  created_at timestamptz not null default now()
);

create index quiz_items_lesson_sort_idx on public.quiz_items (lesson_id, sort);

alter table public.quiz_items enable row level security;

-- Only admins can touch this table via authenticated clients. Normal
-- learners must go through the public view (which omits `correct`).
-- The service_role key bypasses RLS.
create policy "admins manage quiz items"
  on public.quiz_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- quiz_items_public — the view learners query
--
-- SECURITY DEFINER (security_invoker = false) so the view runs as its
-- owner (postgres role), bypassing the restrictive RLS on the base
-- table. The view's own WHERE clause enforces that the caller has
-- access to the lesson before returning rows.
--
-- Crucially, the view does NOT project `correct` or
-- `distractor_rationale`, so no amount of SELECT * leaks the answers.
-- --------------------------------------------------------------------------
create or replace view public.quiz_items_public
with (security_invoker = false) as
select
  qi.id,
  qi.lesson_id,
  qi.sort,
  qi.stem,
  qi.options,
  qi.competency,
  qi.difficulty
from public.quiz_items qi
where exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.has_access = true
);

grant select on public.quiz_items_public to authenticated;
revoke select on public.quiz_items from authenticated;

-- --------------------------------------------------------------------------
-- quiz_attempts — one row per submit
-- --------------------------------------------------------------------------
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score integer not null,
  total integer not null,
  passed boolean not null,
  raw_answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create index quiz_attempts_user_lesson_idx on public.quiz_attempts (user_id, lesson_id);

alter table public.quiz_attempts enable row level security;

create policy "users read own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "users insert own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "admins see all attempts"
  on public.quiz_attempts for all
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.quiz_items is
  'Quiz questions. RLS blocks authenticated SELECT; use the view or service_role.';
comment on view public.quiz_items_public is
  'Learner-facing projection of quiz_items — omits correct and distractor_rationale. SECURITY DEFINER; filters on caller has_access.';
comment on table public.quiz_attempts is
  'One row per submit. Score and passed verdict are computed server-side in the submitQuizAttempt action.';
