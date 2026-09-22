alter table public.lessons add column is_preview boolean not null default false;
alter table public.lessons add column search_text tsvector generated always as (
  to_tsvector('english'::regconfig, (((coalesce(title, ''::text) || ' '::text) || coalesce(summary, ''::text)) || ' '::text) || coalesce(competency, ''::text))) stored;
create index lessons_search_idx on public.lessons using gin (search_text);
