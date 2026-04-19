# GRADE-007: rubric score card component

**Milestone:** M4 Grading
**Dependencies:** GRADE-001, GRADE-002
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

The single most important UX component of the product. Displays grading output with full transparency so the learner can see exactly why they got each score, grounded in a quote from their own submission. Hidden-cost: if this component is cramped or confusing, every learner experience is cramped or confusing.

## Files to create

- `src/components/grading/rubric-score-card.tsx` — top-level card: overall score, pass/hire-ready badges, dimensions list
- `src/components/grading/dimension-row.tsx` — one dimension row: name + description, 1–5 score visual, anchor text for the awarded score, AI justification, quote with visual highlight, suggestion
- `src/components/grading/request-review-button.tsx` — wires to a server action that inserts an `audit_queue` row with `reason='requested'`

## Acceptance criteria

- [ ] All dimensions render in rubric-defined order
- [ ] Each dimension row shows: name, description, score (with 1–5 visual), anchor text for that score pulled from rubric JSON, AI justification, quote from submission (highlighted), suggestion
- [ ] Overall score + pass + hire_ready visible at top
- [ ] "Request human review" button — disabled if already in audit queue
- [ ] Mobile layout: dimension rows stack; desktop: two-column of score visual + text
- [ ] No prop drilling: consumes a `{ submission, scores, rubric }` bundle

## Tests required

- [ ] E2E: visit a seeded graded submission → all dimensions render

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] Manually verified with a real graded submission
- [ ] PR merged
