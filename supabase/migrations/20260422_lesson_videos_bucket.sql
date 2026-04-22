-- ==========================================================================
-- Migration: 20260422_lesson_videos_bucket.sql
-- Ticket: VIDEO-002
-- Purpose: Create the public `lesson-videos` storage bucket so lesson
-- MP4s can be served directly without a third-party host. Writes are
-- admin-only (service role or is_admin()); reads are unauthenticated
-- because lessons.video_url needs to resolve for any logged-in learner
-- with has_access, and the bucket URL carries no authenticator.
--
-- Current usage:
--   - Lesson 20 (raid-logs): 36 MB NotebookLM MP4, uploaded via
--     service-role SDK after this migration applies.
--
-- Future: each lesson that produces a hosted MP4 lands here; HeyGen /
-- Bunny-style iframe embeds use the iframe branch of video-player.tsx
-- instead.
-- ==========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-videos',
  'lesson-videos',
  true, -- public reads; the URL has no authenticator
  209715200, -- 200 MiB per file cap (leaves room for longer-form lessons)
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------------------
-- Object-level RLS. Public reads (bucket.public=true already grants
-- anon SELECT via signed public URLs), but we still need an explicit
-- admin-only WRITE policy. Service-role bypasses RLS, so the upload
-- script in the grading / content-ops toolchain still works.
-- --------------------------------------------------------------------------
create policy "admins write lesson videos"
  on storage.objects for insert
  with check (
    bucket_id = 'lesson-videos'
    and public.is_admin()
  );

create policy "admins update lesson videos"
  on storage.objects for update
  using (
    bucket_id = 'lesson-videos'
    and public.is_admin()
  );

create policy "admins delete lesson videos"
  on storage.objects for delete
  using (
    bucket_id = 'lesson-videos'
    and public.is_admin()
  );
