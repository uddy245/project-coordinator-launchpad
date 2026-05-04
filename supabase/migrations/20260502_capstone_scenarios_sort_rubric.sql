-- Add sort + rubric_summary to capstone_scenarios. The admin capstone form
-- and the /capstone list page both reference these columns; the original
-- remote-applied capstones migration omitted them, so admin upsert and
-- the public list ordering would fail. Already applied to prod — this
-- commit keeps migration history reproducible.
alter table public.capstone_scenarios
  add column if not exists sort integer not null default 100,
  add column if not exists rubric_summary text;

create index if not exists capstone_scenarios_sort_idx
  on public.capstone_scenarios (sort);
