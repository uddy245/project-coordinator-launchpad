# GRADE-010: audit queue sampler + admin queue page

**Milestone:** M4 Grading
**Dependencies:** GRADE-006
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

10% of graded submissions get deterministically sampled into `audit_queue` (reason='sampled'). Learner-requested reviews also land in the queue (reason='requested', priority flag). Admin-only `/audit` page lists pending reviews.

The sampler is deterministic (hash of submission ID) so re-runs don't drift the sample rate and testing is trivial.

## Files to create

- `src/lib/grading/audit-sampler.ts` — `shouldSample(submissionId): boolean` pure function (SHA-256 mod 10 == 0)
- Update `gradeSubmission` to call `shouldSample` on success and insert an `audit_queue` row
- `src/app/(admin)/audit/page.tsx` — replace the placeholder from AUTH-003
- `src/components/admin/audit-queue-table.tsx`
- `src/actions/audit-review.ts` — `requestReview(submissionId)` (learner-initiated, separate path)
- `tests/unit/audit-sampler.test.ts` — ~10% ±2% over 10,000 random IDs

## Acceptance criteria

- [ ] Sampler produces 8–12% hits over 10,000 IDs
- [ ] Graded submissions are inserted into `audit_queue` when sampled OR when learner clicks "Request human review"
- [ ] Admin `/audit` shows pending items: learner initials (PII-minimizing default), date, AI overall score, reason (sampled/requested)
- [ ] Requested reviews visually flagged (priority)
- [ ] Non-admin → 404 (existing AUTH-003 gate)

## Tests required

- [ ] Unit: sampler distribution
- [ ] Integration: non-admin cannot select from audit_queue (RLS from GRADE-001)

## Definition of done

- [ ] Acceptance criteria checked
- [ ] PR merged
