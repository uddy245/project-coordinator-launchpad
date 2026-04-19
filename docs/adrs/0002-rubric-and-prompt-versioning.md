# ADR 0002 — Rubric and prompt versioning

**Status:** Accepted · 2026-04-19
**Context:** post-MVP, after CAL-001 / CAL-002 made the calibration corpus an automated regression gate.

## Context

The product grades learner submissions by sending Claude a rubric + a
prompt + the submission text and forcing a tool-use response. Two
pieces of state govern every grading call:

- **Rubrics** — JSON blobs in `public.rubrics`, mirrored in
  `docs/rubrics/<slug>-v<n>.json`. Each row has `(competency, version,
  is_current)` with `unique (competency, version)` and a check that
  ensures exactly one `is_current=true` row per competency.
- **Prompts** — markdown bodies in `public.prompts`, mirrored in
  `docs/prompts/<slug>-v<n>.md`. Same shape: `(name, version,
  is_current)`, exactly one current per name.

`rubric_scores` rows record `prompt_version` and `model` at grade
time — so historical scores remain attributable to the exact
(rubric, prompt, model) that produced them.

Neither CLAUDE.md nor BUILD_PLAN explains end-to-end how you bump a
version without breaking prod, recomputing costs, or losing the
audit trail. This ADR fills that gap.

## Decision

Rubrics and prompts are **append-only, versioned, and pointer-swapped**.
Never edit an existing row or file. To change grading behavior:

### 1. Create a new version file

- Rubric: copy `docs/rubrics/raid-v1.json` → `docs/rubrics/raid-v2.json`.
  Bump the `rubric_version` field inside the JSON (semver or integer).
  Make the change. Do **not** touch `raid-v1.json` — production traffic
  that was graded against v1 still reads it from the DB row; the file
  is the canonical source.
- Prompt: copy `docs/prompts/grade-raid-v1.md` → `grade-raid-v2.md`.
  Bump the `Version:` header. Make the change.

### 2. Write a migration that inserts the new row and flips the pointer

```sql
-- supabase/migrations/<YYYYMMDD>_rubric_raid_v2.sql
begin;

insert into public.rubrics (competency, version, schema_json, is_current)
values ('risk_identification', 2, $rubric$<paste JSON>$rubric$::jsonb, false);

update public.rubrics set is_current = false
  where competency = 'risk_identification' and is_current;

update public.rubrics set is_current = true
  where competency = 'risk_identification' and version = 2;

commit;
```

Two-step pointer swap (flip old off, flip new on) satisfies the
"exactly one current" constraint. Same shape for `prompts`.

### 3. Run the calibration corpus

Because the PR touches `docs/rubrics/**` (or `docs/prompts/**`), the
`Calibration corpus` workflow will trigger automatically. All 5
fixtures must still land within ±2 per cell, with ≥80% of all cells
within ±1 in aggregate. If the new version regresses calibration:

- **Do not merge.** Either revise the rubric/prompt, or revise the
  fixtures' expected scores if the regression is an intentional
  recalibration (e.g. raising the bar on a dimension). Document the
  expected-score change in the PR.

### 4. Merge and deploy

`supabase db push` on main applies the migration to prod. The next
grading call uses the new version immediately — `loadContext()` in
`src/lib/grading/service.ts` always reads `where is_current = true`.

### 5. Do **not** re-grade historical submissions

Historical `rubric_scores` rows keep their original `model` and
`prompt_version`. Scores remain attributable to the pipeline that
produced them. If a re-grade is needed (e.g. for a specific user
dispute), do it out-of-band — insert a new `submission` row pointing
at the same artifact and grade it fresh.

## Rollback

Pointer-swap in reverse. Write a new migration that flips `is_current`
back to the prior version. Never delete the newer row — keep the audit
trail intact. If a prompt/rubric bug is severe enough to require
rollback, also open an incident note in `docs/incidents/` (if that
directory ever exists).

## Consequences

### Good

- **Historical attribution is preserved.** Any score card rendered
  from `rubric_scores` can be traced to the exact prompt + rubric
  + model that produced it.
- **Calibration automatically gates bumps.** CI ran once, CI caught a
  real validator cap issue on the first PR-gated run; this moat grows
  teeth over time.
- **Rollback is a new migration, not a schema restore.** No Supabase
  UI clicks.
- **Files are immutable after merge.** Reviewers can diff v1 → v2
  directly.

### Cost

- Every rubric or prompt change is a migration PR, not a one-line edit.
  Calibration cost: ~$0.60 per triggering PR. Acceptable.
- Forgetting to bump the `rubric_version` field inside the JSON is
  possible. Future lint: assert `schema_json.rubric_version` matches
  the DB `version` on insert. Not blocking.

## Related

- Migration `20260105_seed_lesson_20.sql` seeded v1 of both.
- CLAUDE.md non-negotiable rule #6: "Every prompt or rubric change is
  a new version (new file). Flip `is_current` in the DB; never edit
  the old file."
- BUILD_PLAN §8.6 describes the high-level intent.
- `tests/integration/calibration.test.ts` is the automated gate.
