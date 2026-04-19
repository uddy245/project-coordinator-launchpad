# GRADE-005: Anthropic grading service

**Milestone:** M4 Grading
**Dependencies:** GRADE-004
**Estimated session length:** long (90 min+, plan to split)
**Status:** not started

## Context

The core of the moat. Given a submission ID, this service:

1. Loads the submission + extracted text + lesson scenario
2. Loads the current rubric and prompt from the DB
3. Calls Claude (`claude-sonnet-4-5`, temperature 0) with tool-use forcing a structured score object
4. Validates the response with Zod against a rubric-derived schema
5. On validation failure: retries once with the validation error appended to the prompt
6. On second failure: sets `submissions.status='grading_failed'`
7. On success: writes one `rubric_scores` row per dimension + updates the submission with overall_score / pass / hire_ready / status='graded'
8. Logs input/output tokens per row for cost analysis

## Files to create

- `src/lib/anthropic/client.ts` — SDK wrapper, pinned model
- `src/lib/grading/service.ts` — `gradeSubmission(submissionId)` orchestrator
- `src/lib/grading/validator.ts` — Zod schema built dynamically from the rubric JSON
- `src/lib/grading/prompts.ts` — prompt loader
- `src/lib/grading/rubrics.ts` — rubric loader
- `tests/unit/validator.test.ts`
- `tests/integration/grading-service.test.ts` — uses mocked Anthropic client to exercise the retry + DB write path

## Acceptance criteria

- [ ] End-to-end happy path: pending submission → graded with 5 rubric_scores rows + overall_score + pass + hire_ready set
- [ ] Validation failure triggers exactly one retry
- [ ] Two consecutive validation failures → `status='grading_failed'`, no partial scores written
- [ ] Tool-use schema forces `record_rubric_scores` with all 5 dimensions
- [ ] Model name and prompt_version persisted on every rubric_scores row
- [ ] Action is idempotent: calling `gradeSubmission` on an already-graded submission is a no-op

## Tests required

- [ ] Unit: Zod validator accepts valid tool output, rejects missing dimensions, out-of-range scores, missing quote for score ≥3
- [ ] Integration: mocked Anthropic client returning valid output → expected DB state
- [ ] Integration: mocked client returning invalid-then-valid → DB state matches the valid response + one retry recorded

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
