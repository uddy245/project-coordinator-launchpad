# Calibration corpus

This directory holds the regression fixtures for the grading pipeline. Each
fixture is a `submission.txt` plus an `expected.json` describing the dimension
scores a competent human reviewer would assign — with explicit per-dimension
`tolerance` for places where the rubric is genuinely ambiguous.

The integration test at `tests/integration/calibration.test.ts` runs each
fixture through the real Anthropic API (skipped unless `RUN_CALIBRATION=1`)
and asserts every dimension is within tolerance, plus an aggregate ≥80% ±1
pass-rate across the corpus.

## Current coverage

| Competency | Rubric | Fixtures | Notes |
|---|---|---|---|
| `risk_identification` | `docs/rubrics/raid-v1.json` | 10 | RAID log for healthcare-integration-pilot-v1 scenario |

10 fixtures cover: empty submission, off-topic, structured-but-empty, novice
(2), intermediate (2), hire-ready (1), mixed-profile (1), sparse-but-high-
quality (1). The mix is deliberately weighted toward boundary cases the model
has historically drifted on, not just floor/ceiling examples.

## Expansion roadmap

The platform has 25 modules planned; `risk_identification` is the first
competency wired end-to-end. Adding a new competency to the corpus is a
four-step process:

1. **Author the rubric** at `docs/rubrics/<competency>-v1.json`. Five
   dimensions, each with explicit 1–5 anchors.
2. **Author the grading prompt** at `docs/prompts/grade-<competency>-v1.md`.
   Stays consistent with the RAID prompt structure (system + scenario + rubric
   + submission, JSON-schema-constrained output via tool use).
3. **Author a scenario** at `tests/fixtures/<competency>/scenario.txt`. The
   scenario is the "prompt the learner sees" — concrete, role-specific.
4. **Author 8–10 fixtures** at `tests/fixtures/<competency>/<id>/`. Mix:
   - 1 empty submission (floor sanity check)
   - 1 off-topic submission (calibration that scores stay floor-ish even on
     coherent-but-wrong content)
   - 1 structured-but-empty (form filled in with placeholder text)
   - 2 novice submissions (one obvious low, one borderline)
   - 2 intermediate submissions (pass threshold ±1)
   - 1 hire-ready submission (clear ceiling on most dims)
   - 1 mixed-profile (deliberately inverts dimensions to test halo bias)
   - 1 dimensional-inversion / sparse-but-high-quality (tests whether the
     grader can score one dim low without dragging others down)
5. **Wire it into `tests/integration/calibration.test.ts`** by adding a row
   to the `COMPETENCIES` array with `competency`, `rubricPath`, `promptPath`.

## Open competencies (not yet wired)

These have lessons in the platform but no rubric / fixtures yet. Listed in
the rough order they should be tackled, based on shipped lesson coverage:

- `written_communication` (Module 03 — Written Voice). Should have its own
  rubric since the dimensions diverge from RAID (clarity, audience-fit,
  structure, tone, concision).
- `lifecycle_application` (Module 04 — Project Lifecycle). Cross-cuts: given
  a half-built project description, identify what phase it's in and what's
  missing.
- `change_control` (Module 12 — Change Requests, when shipped). RAID-adjacent
  but distinct enough to warrant its own rubric.
- `mock_interview_realism` (already has a separate single-dimension grader
  in `src/lib/grading/mock-interview.ts`; not part of this corpus, lives in
  the `mock_interview_responses` table).

## Running the calibration suite

```bash
RUN_CALIBRATION=1 ANTHROPIC_API_KEY=sk-... pnpm vitest run tests/integration/calibration.test.ts
```

Costs ~$0.05 per fixture per run with Sonnet 4.5 at T=0. Runs in ~30s.

The test enforces:
- Each dimension within `expected.tolerance` of `expected.score` for ≥80%
  of fixtures
- Aggregate per-fixture overall_competency_score within ±1 of expected
- `pass` and `hire_ready` boolean alignment

A failed run is not automatically a regression — drift on a single
borderline fixture is normal. Investigate the dimension that drifted; if
the model's reasoning is defensible, widen the tolerance with a note
explaining why. If the model is wrong, that's a prompt or rubric bug.
