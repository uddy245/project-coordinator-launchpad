-- Add a signup_source column for funnel attribution (e.g. "preview-coordinator-role").
-- Populated from the signUp() server action via the ?ref= URL param. Used by
-- analytics queries to measure preview→signup conversion without bringing in
-- a third-party analytics tool.

alter table public.profiles
  add column if not exists signup_source text;

create index if not exists profiles_signup_source_idx
  on public.profiles (signup_source)
  where signup_source is not null;

comment on column public.profiles.signup_source is
  'Optional attribution token from the signup URL ?ref= param. Lowercased, max 80 chars. Sanitised at the application layer to [a-z0-9_-]+.';

-- Backfill from auth.users.raw_user_meta_data, where the action stashes the
-- value at signup time. The handle_new_user() trigger should sync this on
-- subsequent signups; the explicit copy here covers any users who signed up
-- before the trigger was updated.
update public.profiles p
set signup_source = lower(u.raw_user_meta_data->>'signup_source')
from auth.users u
where p.id = u.id
  and p.signup_source is null
  and u.raw_user_meta_data ? 'signup_source';
