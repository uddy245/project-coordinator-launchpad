# GRADE-003: artifact uploader

**Milestone:** M4 Grading
**Dependencies:** GRADE-001, LES-005
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

Drag-and-drop file upload targeting a Supabase Storage bucket `submissions`. Accepts XLSX / PDF / DOCX up to 10 MB. On successful upload, inserts a `submissions` row with `status='pending'` and redirects the learner to `/submissions/[id]`, where the GRADE-008 detail page shows a grading-in-progress state.

## Files to create

- `supabase/migrations/20260112_submissions_bucket.sql` — creates the `submissions` storage bucket + RLS policies (private bucket, users can insert/read their own files via storage RLS)
- `src/components/grading/artifact-uploader.tsx`
- `src/actions/submission.ts` — `createSubmission(input)` server action
- `tests/unit/submission-action.test.ts`

## Acceptance criteria

- [ ] Drag-and-drop and click-to-browse both work
- [ ] Progress bar during upload
- [ ] File > 10 MB rejected client-side AND in the action (server-side rejection is the authoritative one)
- [ ] Non-XLSX/PDF/DOCX MIME types rejected client-side and server-side
- [ ] Successful path: file lands in `submissions/{user_id}/{submission_id}.{ext}`, row inserted, action returns `{ ok: true, data: { submissionId } }`
- [ ] UI redirects to `/submissions/[id]` on success
- [ ] Storage RLS: user cannot read another user's file path

## Tests required

- [ ] Unit: validation (size cap, MIME type, auth required)
- [ ] E2E: upload a small XLSX and land on the detail page

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified upload on preview
- [ ] PR merged
