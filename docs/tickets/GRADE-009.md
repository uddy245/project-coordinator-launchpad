# GRADE-009: submission history on the lesson page

**Milestone:** M4 Grading
**Dependencies:** GRADE-008
**Estimated session length:** short (≤30 min)
**Status:** not started

## Context

On the lesson page (Quiz tab is currently the last UI; add a new section or tab for "Your submissions"), list the learner's prior submissions for this lesson with date, status, and overall score. Click-through to `/submissions/[id]`.

## Files to create

- `src/components/grading/submission-history.tsx`
- Wire into the lesson page under the artifact uploader (GRADE-003)

## Acceptance criteria

- [ ] List renders in reverse chronological order
- [ ] Each row: date, status badge, overall score (or "Grading..." if pending), click target = submission detail
- [ ] Empty state: "You haven't submitted an artifact for this lesson yet."

## Tests required

- [ ] E2E smoke: list renders for a user with no submissions

## Definition of done

- [ ] Acceptance criteria checked
- [ ] PR merged
