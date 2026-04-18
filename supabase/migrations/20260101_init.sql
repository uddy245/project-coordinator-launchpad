-- ==========================================================================
-- Migration: 20260101_init.sql
-- Purpose: Initial schema for Project Coordinator Launchpad
-- Covers: profiles, lessons, rubrics, prompts, and shared helpers
-- ==========================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==========================================================================
-- Shared helpers
-- ==========================================================================

-- updated_at trigger (reusable)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==========================================================================
-- profiles (mirrors auth.users with app-specific fields)
-- ==========================================================================
create type public.user_role as enum ('learner', 'admin');
create type public.industry_track as enum ('it_saas', 'healthcare', 'construction', 'marketing');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'learner',
  has_access boolean not null default false,
  industry_track public.industry_track default 'it_saas',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "users see own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admins see all profiles"
  on public.profiles for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup via auth trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- is_admin helper (used in RLS policies across tables)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- ==========================================================================
-- lessons
-- ==========================================================================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  number integer not null,
  title text not null,
  summary text,
  video_url text,
  scenario_text text,
  estimated_minutes integer,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_number_idx on public.lessons (number);
create index lessons_published_idx on public.lessons (is_published) where is_published = true;

alter table public.lessons enable row level security;

create policy "learners with access see published lessons"
  on public.lessons for select
  using (
    is_published = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.has_access = true
    )
  );

create policy "admins manage lessons"
  on public.lessons for all
  using (public.is_admin());

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ==========================================================================
-- rubrics (versioned)
-- ==========================================================================
create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  competency text not null,
  version integer not null,
  schema_json jsonb not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (competency, version)
);

-- Exactly one current version per competency
create unique index rubrics_current_unique
  on public.rubrics (competency) where is_current = true;

alter table public.rubrics enable row level security;

create policy "anyone with access reads current rubrics"
  on public.rubrics for select
  using (
    is_current = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.has_access = true
    )
  );

create policy "admins manage rubrics"
  on public.rubrics for all
  using (public.is_admin());

-- ==========================================================================
-- prompts (versioned)
-- ==========================================================================
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  body text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (name, version)
);

-- Exactly one current version per prompt name
create unique index prompts_current_unique
  on public.prompts (name) where is_current = true;

alter table public.prompts enable row level security;

-- Prompts are admin-only. Service role (used by edge function) bypasses RLS.
create policy "admins manage prompts"
  on public.prompts for all
  using (public.is_admin());

-- ==========================================================================
-- Comments for documentation
-- ==========================================================================
comment on table public.profiles is 'User profiles, one per auth.users row, auto-created on signup';
comment on column public.profiles.has_access is 'True after successful Stripe purchase; gates access to paid content';
comment on column public.profiles.role is 'learner (default) or admin';
comment on table public.lessons is 'Course lessons; only published lessons are visible to learners';
comment on table public.rubrics is 'Versioned AI grading rubrics; flip is_current to deploy a new version';
comment on table public.prompts is 'Versioned AI grading prompt templates; flip is_current to deploy';
