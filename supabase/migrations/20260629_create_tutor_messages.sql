-- Tutor chat persistence.
-- Stores both sides of every AI tutor exchange. Doubles as chat history
-- (loaded on drawer open) and token accounting for the daily spend cap.
--
-- The tutor route writes via the service-role client (admin bypass); the
-- GET /api/tutor route reads via the user-scoped client, gated by RLS
-- so each user sees only their own messages.

create table if not exists public.tutor_messages (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  lesson_slug   text,                          -- null when not lesson-anchored
  role          text        not null check (role in ('user', 'assistant')),
  content       text        not null,
  input_tokens  integer     not null default 0, -- set on assistant rows only
  output_tokens integer     not null default 0, -- set on assistant rows only
  model         text,                           -- e.g. 'claude-sonnet-4-5'
  created_at    timestamptz not null default now()
);

-- RLS: users may read and insert only their own rows.
-- The admin client (service role) bypasses RLS for the spend cap queries.
alter table public.tutor_messages enable row level security;

drop policy if exists "tutor_messages: select own" on public.tutor_messages;
create policy "tutor_messages: select own" on public.tutor_messages
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "tutor_messages: insert own" on public.tutor_messages;
create policy "tutor_messages: insert own" on public.tutor_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- No update / delete for end-users. Service role handles retention if needed.

-- Index for history loads and the per-user daily message cap.
create index if not exists tutor_messages_user_created_idx
  on public.tutor_messages (user_id, created_at desc);

-- Index for the global spend cap query (assistant rows by date).
create index if not exists tutor_messages_role_created_idx
  on public.tutor_messages (role, created_at desc);

-- Grants — tables created via the management API don't always inherit
-- Supabase's default privileges, so grant explicitly. RLS still gates rows.
grant all  on public.tutor_messages to service_role;
grant select, insert on public.tutor_messages to authenticated;
