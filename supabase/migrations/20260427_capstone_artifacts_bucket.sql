-- Storage bucket for capstone artifact uploads. Private — files are
-- accessed via short-lived signed URLs only. Each object lives at
-- <user_id>/<attempt_id>/<artifact_kind>.<ext>.

insert into storage.buckets (id, name, public)
values ('capstone-artifacts', 'capstone-artifacts', false)
on conflict (id) do nothing;

-- Storage RLS — owner-only reads/writes. The application also goes
-- through service role for admin paths.
drop policy if exists "capstone-artifacts: owner read" on storage.objects;
create policy "capstone-artifacts: owner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'capstone-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "capstone-artifacts: owner insert" on storage.objects;
create policy "capstone-artifacts: owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'capstone-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "capstone-artifacts: owner delete" on storage.objects;
create policy "capstone-artifacts: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'capstone-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
