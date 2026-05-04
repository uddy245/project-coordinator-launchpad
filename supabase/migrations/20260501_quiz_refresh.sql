-- Refreshable quiz items: hybrid pool with per-user "seen" history.
--
-- Adds two columns to quiz_items so we can distinguish AI-generated items
-- from authored ones (and surface this in admin), plus a per-user table
-- tracking which items each learner has already been served. Refresh just
-- means "pick items the user hasn't seen yet, generate via Claude if the
-- pool is exhausted." See plan: refreshable quiz items.

-- 1. Mark which items came from Claude vs. authored by humans.
alter table quiz_items
  add column if not exists is_ai_generated boolean not null default false,
  add column if not exists generated_at timestamptz;

-- 2. Per-user "seen" history. Composite PK prevents double-recording, and
--    the lesson_id index supports the common "for this user, in this lesson,
--    which items have they seen?" query path.
create table if not exists quiz_item_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_item_id uuid not null references quiz_items(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, quiz_item_id)
);

create index if not exists quiz_item_seen_user_lesson_idx
  on quiz_item_seen (user_id, lesson_id);

-- 3. RLS: each user can only see / mutate their own rows. Admin writes go
--    through the service-role client (bypasses RLS), so the action layer
--    keeps full control.
alter table quiz_item_seen enable row level security;

drop policy if exists "own_seen_select" on quiz_item_seen;
create policy "own_seen_select" on quiz_item_seen
  for select using (auth.uid() = user_id);

drop policy if exists "own_seen_insert" on quiz_item_seen;
create policy "own_seen_insert" on quiz_item_seen
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_seen_delete" on quiz_item_seen;
create policy "own_seen_delete" on quiz_item_seen
  for delete using (auth.uid() = user_id);
