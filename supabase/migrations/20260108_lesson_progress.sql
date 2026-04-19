-- ==========================================================================
-- Migration: 20260108_lesson_progress.sql
-- Ticket: LES-004 (video progress columns), extended in LES-009.
-- Purpose: One row per (user, lesson) tracking video-watch position,
--          quiz-pass, and artifact-submission booleans.
-- ==========================================================================

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  video_seconds_watched integer not null default 0,
  video_duration integer,
  video_watched boolean not null default false,
  quiz_passed boolean not null default false,
  artifact_submitted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress (user_id);

alter table public.lesson_progress enable row level security;

create policy "users see own progress"
  on public.lesson_progress for select
  using (auth.uid() = user_id);

create policy "users upsert own progress"
  on public.lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "users update own progress"
  on public.lesson_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins manage all progress"
  on public.lesson_progress for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

comment on table public.lesson_progress is
  'Per-learner per-lesson progress. video_watched flips at >=90% watched; '
  'quiz_passed flips from submitQuizAttempt; artifact_submitted flips in M4.';

-- Also add video_url to lessons so the player has a source.
-- null video_url renders a "coming soon" placeholder — the learner's
-- progress row stays valid either way.
alter table public.lessons add column if not exists video_url text;

comment on column public.lessons.video_url is
  'Absolute embed URL (e.g. Bunny Stream iframe). Null while content is in production.';
