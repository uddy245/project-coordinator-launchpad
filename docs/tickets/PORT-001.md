# PORT-001: basic portfolio view

**Milestone:** M4 Grading
**Dependencies:** GRADE-009
**Estimated session length:** short (≤30 min)
**Status:** not started

## Context

`/portfolio` lists the learner's graded artifacts — in MVP, just the RAID log if submitted. Each card: title, date, overall score, pass/hire-ready badge. Click-through to `/submissions/[id]`. A "Share" button copies a read-only link to clipboard (the link respects RLS — only the owner and admins can actually load it; true public-read portfolio links are a future ticket).

## Files to create

- `src/app/(app)/portfolio/page.tsx`
- `src/components/portfolio/artifact-card.tsx`
- Navigation: add Portfolio link to the (app) header

## Acceptance criteria

- [ ] Renders every graded submission for the user, sorted by date desc
- [ ] Each card: lesson title, overall_score, pass/hire-ready badge, submitted date, "View" link
- [ ] Empty state: "You haven't submitted any artifacts yet. Start with Lesson 20."
- [ ] "Share" button copies `{APP_URL}/submissions/{id}` to clipboard

## Tests required

- [ ] E2E smoke: unauthed portfolio access redirects; authed with no submissions shows empty state

## Definition of done

- [ ] Acceptance criteria checked
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
