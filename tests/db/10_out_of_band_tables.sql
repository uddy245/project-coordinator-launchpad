-- Prod objects created out-of-band (never in supabase/migrations). Shapes
-- pulled from the live DB (see ba-launchpad backfill migrations).
-- prod-only objects (from ba-launchpad backfills, pulled from live PC db)
create table public.mock_interview_scenarios (
  id uuid primary key default gen_random_uuid(), slug text not null unique, prompt text not null,
  competency text not null,
  category text not null check (category in ('behavioural', 'procedural', 'judgment')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  sort integer not null default 0, is_published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.mock_interview_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.mock_interview_scenarios(id) on delete cascade,
  response_text text not null,
  status text not null default 'graded_pending' check (status in ('graded_pending', 'grading', 'graded', 'grading_failed')),
  overall_score numeric, pass boolean, feedback_summary text, graded_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, scenario_id));
create table public.capstone_scenarios (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  brief text not null, required_artifacts text[] not null default '{}', estimated_hours integer,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.capstone_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.capstone_scenarios(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded', 'withdrawn')),
  started_at timestamptz not null default now(), submitted_at timestamptz, graded_at timestamptz,
  overall_score numeric, pass boolean, feedback_summary text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
