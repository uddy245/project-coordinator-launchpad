-- Upgrade search_lessons() to return a ts_headline-generated snippet
-- alongside the existing fields. The snippet contains <mark>…</mark>
-- highlights for the matched query terms. Falls back to the lesson
-- summary when the matched terms only appear in the title.
--
-- Replaces the previous version installed via 20260420_search_lessons_fn
-- (created via the Supabase MCP — recorded here for completeness).

drop function if exists public.search_lessons(text);

create or replace function public.search_lessons(q text)
returns table (
  id uuid,
  slug text,
  number int,
  title text,
  summary text,
  competency text,
  snippet text,
  rank float4
)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('english', q) as ts
  )
  select
    l.id,
    l.slug,
    l.number,
    l.title,
    l.summary,
    l.competency,
    coalesce(
      nullif(
        ts_headline(
          'english',
          coalesce(l.summary, l.title),
          (select ts from query),
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=22,MinWords=8,ShortWord=3,FragmentDelimiter= … '
        ),
        ''
      ),
      l.summary
    ) as snippet,
    ts_rank(l.search_text, (select ts from query))::float4 as rank
  from public.lessons l, query
  where l.is_published = true
    and l.search_text @@ query.ts
  order by rank desc, l.number asc
  limit 50;
$$;

grant execute on function public.search_lessons(text) to authenticated;
