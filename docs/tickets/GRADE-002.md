# GRADE-002: rubric + prompt reconciliation

**Milestone:** M4 Grading
**Dependencies:** GRADE-001
**Estimated session length:** short (≤30 min)
**Status:** not started

## Context

LES-001 already seeded the RAID rubric and grading prompt. This ticket verifies the on-disk files (`docs/rubrics/raid-v1.json`, `docs/prompts/grade-raid-v1.md`) match the DB rows, and adds a unit test that guards against drift — if someone edits one side without the other, CI fails.

## Files to create / modify

- `tests/unit/rubric-prompt-parity.test.ts` — reads on-disk rubric + prompt, asserts shape matches what the grading service needs
- If discrepancies exist: a new migration `20260111_reseed_raid_v1.sql` that reconciles

## Acceptance criteria

- [ ] `docs/rubrics/raid-v1.json` parses as valid JSON and has 5 dimensions summing to weight 1.0
- [ ] `docs/prompts/grade-raid-v1.md` exists and contains the `{{rubric_json}}` / `{{scenario_text}}` / `{{submission_text}}` placeholders
- [ ] Parity test passes

## Tests required

- [ ] Unit: `tests/unit/rubric-prompt-parity.test.ts`

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
