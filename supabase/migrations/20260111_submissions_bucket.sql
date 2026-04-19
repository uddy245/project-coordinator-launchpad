-- ==========================================================================
-- Migration: 20260111_submissions_bucket.sql
-- Ticket: GRADE-003
-- Purpose: Create the private `submissions` storage bucket with RLS so
-- learners upload into their own prefix and can only read their own
-- files. Service role bypasses these policies (used by the grading
-- pipeline to fetch the file and extract text).
-- ==========================================================================

-- Create the bucket. Idempotent via ON CONFLICT.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  10485760, -- 10 MiB
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------------------
-- Object-level RLS: users can INSERT into `submissions/{their_uid}/...`
-- and READ from the same prefix. Everything else is denied.
-- storage.foldername(name)[1] is the first path segment — by convention
-- we store objects at `{user_id}/{submission_id}.{ext}`.
-- --------------------------------------------------------------------------
create policy "users insert own submission files"
  on storage.objects for insert
  with check (
    bucket_id = 'submissions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users read own submission files"
  on storage.objects for select
  using (
    bucket_id = 'submissions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "admins read all submission files"
  on storage.objects for select
  using (
    bucket_id = 'submissions'
    and public.is_admin()
  );
