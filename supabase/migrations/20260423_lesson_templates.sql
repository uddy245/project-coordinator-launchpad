-- Lesson templates — DB-backed catalog so admins can add starter/sample
-- workbooks without code changes. Static catalog at
-- src/lib/lessons/templates.ts remains as a fallback / seed source for
-- pre-existing lessons whose XLSX live under /public/templates.
--
-- The reader merges static + DB results, so adding a row here for a
-- lesson that already has static entries simply *extends* its template
-- list — useful for adding a fourth industry sample without redeploying.

create table if not exists public.lesson_templates (
  id            uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  title        text not null,
  description  text,
  file_url     text not null,
  kind         text not null check (kind in ('starter', 'example')),
  sort         int  not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists lesson_templates_lesson_id_idx on public.lesson_templates (lesson_id, sort);

alter table public.lesson_templates enable row level security;

-- Anyone authenticated can read (the lesson page does this server-side
-- via the user's session). Anonymous reads are gated by lesson preview
-- mode in the application layer, not here.
drop policy if exists "lesson_templates: read for authed" on public.lesson_templates;
create policy "lesson_templates: read for authed"
  on public.lesson_templates
  for select
  to authenticated
  using (true);

-- Admin writes go through the service-role client; no policy needed for
-- inserts/updates from the application (service role bypasses RLS).
-- Block direct authenticated writes explicitly so we don't accidentally
-- enable client-side mutations.
drop policy if exists "lesson_templates: no writes for authed" on public.lesson_templates;

create trigger lesson_templates_set_updated_at
  before update on public.lesson_templates
  for each row execute function public.set_updated_at();

-- Storage bucket for uploaded XLSX files. Public read so workbook-panel
-- can render <a href={file_url}> directly without a signed URL flow.
insert into storage.buckets (id, name, public)
values ('lesson-templates', 'lesson-templates', true)
on conflict (id) do update set public = excluded.public;

-- Storage RLS — reads open, writes restricted to service role.
drop policy if exists "lesson-templates: public read" on storage.objects;
create policy "lesson-templates: public read"
  on storage.objects for select
  using (bucket_id = 'lesson-templates');
