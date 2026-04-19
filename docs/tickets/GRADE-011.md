# GRADE-011: admin audit review page

**Milestone:** M4 Grading
**Dependencies:** GRADE-010
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

`/audit/[id]` shows the submission, the AI's scores, and lets admins approve (no change) or override individual dimension scores with a written note. Original AI scores in `rubric_scores` are NEVER mutated — overrides write to `audit_records`, and the submission detail page layers them on top at display time.

## Files to create

- `src/app/(admin)/audit/[id]/page.tsx`
- `src/components/admin/audit-review-panel.tsx`
- `src/actions/audit.ts` — `approveAudit(queueId)`, `overrideScores(queueId, overrides[], note)`
- `src/lib/grading/apply-overrides.ts` — pure function: takes raw rubric_scores + latest audit_records → effective scores
- `tests/unit/apply-overrides.test.ts`
- `tests/integration/audit-actions.test.ts`

## Acceptance criteria

- [ ] Admin reads submission detail + AI scores + per-dimension editable inputs
- [ ] Approve → writes `audit_records` with `decision='approved'`, no overrides
- [ ] Override → writes `audit_records` with `decision='overridden'`, `overrides` jsonb, `note` required
- [ ] `rubric_scores` rows are NEVER updated or deleted
- [ ] Learner's submission detail page (GRADE-008) shows effective scores (AI score with a "reviewed" badge + admin note) when an override exists

## Tests required

- [ ] Integration: non-admin call to `approveAudit` / `overrideScores` rejected
- [ ] Integration: override → audit_records row exists, rubric_scores unchanged
- [ ] Unit: apply-overrides takes latest audit_record per dimension

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified override flow on preview
- [ ] PR merged
