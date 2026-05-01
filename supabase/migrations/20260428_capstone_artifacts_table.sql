-- capstone_artifacts table — one row per uploaded file per attempt per
-- artifact kind. The application replaces existing rows on re-upload, so
-- only the latest version of each kind survives. The `file_path` is the
-- object key in the `capstone-artifacts` bucket (see 20260427).
--
-- Defensive `if not exists` clauses everywhere — the table may already
-- exist if the original capstone schema migration was applied via the
-- Supabase MCP earlier in the build. This file documents the current
-- shape so a fresh checkout can stand up a working capstone path.

create table if not exists public.capstone_artifacts (
  id            uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.capstone_attempts (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null,
  file_path    text not null,
  file_name    text not null,
  file_size    bigint,
  content_type text,
  created_at   timestamptz not null default now()
);

create index if not exists capstone_artifacts_attempt_idx
  on public.capstone_artifacts (attempt_id, kind);

alter table public.capstone_artifacts enable row level security;

drop policy if exists "capstone_artifacts: owner read" on public.capstone_artifacts;
create policy "capstone_artifacts: owner read"
  on public.capstone_artifacts
  for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts/deletes go through service role from the server action.

-- Add submitted_at to capstone_attempts if missing.
alter table public.capstone_attempts
  add column if not exists submitted_at timestamptz;
