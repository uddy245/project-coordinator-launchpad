create table public.learning_activity (
  user_id uuid not null references auth.users(id) on delete cascade, activity_date date not null,
  events_count integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, activity_date));
create or replace function public.user_streak(p_user_id uuid) returns integer language sql stable set search_path = public as $$
  with active as (select activity_date from public.learning_activity where user_id = p_user_id order by activity_date desc),
  with_gap as (select activity_date, (current_date - activity_date) as days_ago, row_number() over (order by activity_date desc) - 1 as idx from active)
  select coalesce(count(*)::integer, 0) from with_gap where days_ago = idx or (days_ago = idx + 1 and idx = 0); $$;
-- Mirror Neon: drop every RLS policy, disable RLS, remove the auth trigger.
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname in ('public','storage') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
