# GRADE-008: submission detail page

**Milestone:** M4 Grading
**Dependencies:** GRADE-003, GRADE-007
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

`/submissions/[id]` renders the submission metadata, the extracted text preview, and either a "grading in progress" state (with 5s polling) or the full RubricScoreCard from GRADE-007.

## Files to create

- `src/app/(app)/submissions/[id]/page.tsx`
- `src/components/grading/submission-detail.tsx`
- `src/components/grading/grading-in-progress.tsx` — polls via a server action until status is graded / grading_failed

## Acceptance criteria

- [ ] Page loads submission by ID via RLS (user only sees their own — admins see all)
- [ ] Unknown ID or RLS-blocked → 404
- [ ] `status='pending' | 'grading'` → progress state polling every 5s, max 5 min
- [ ] `status='graded'` → full rubric score card + extracted text preview in a collapsible panel
- [ ] `status='grading_failed'` → apology message, admin has been notified (log a row to a future `admin_notifications` table or just console.error for now)
- [ ] `status='manual_review'` → message indicating the submission is in the audit queue

## Tests required

- [ ] E2E: unauthed → redirect to login
- [ ] E2E: authed but not the owner → 404

## Definition of done

- [ ] Acceptance criteria checked
- [ ] Manually verified all four status states on preview
- [ ] PR merged
