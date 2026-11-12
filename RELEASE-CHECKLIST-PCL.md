# Release checklist — PR #105 and PR #106

Written 12 November 2026 against #105 at `38bac39` and #106 at `855f4a8`.

| PR                                                                        | What it changes                                                                              | Learner-visible on merge?                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [#105](https://github.com/uddy245/project-coordinator-launchpad/pull/105) | `scripts/seed-production-video.mjs` publishes videos under the lesson slug; adds `--dry-run` | No. Tooling only.                                                                             |
| [#106](https://github.com/uddy245/project-coordinator-launchpad/pull/106) | Lesson 17 and 20 reading and scripts; push-back rubric and prompt v2; three data migrations  | Yes. The Read tab changes on deploy; grading and quiz change when the migrations are applied. |

Merging to `main` deploys to production automatically (Vercel). Migrations are **not** applied by the deploy; they are run by hand.

## 0. Gates — all must be true before anything is merged

- [x] Owner content approval for #106 — recorded on the PR, 12 November 2026, at `855f4a8`
- [ ] QA review of #106
- [ ] Security review of #106
- [ ] Review of #105
- [ ] #106 head is still `855f4a8`, or the owner has re-approved the new head
- [ ] CI is green on both PRs (Typecheck / Lint / Test / Build, DB integration)
- [ ] Both PRs marked "Ready for review" (they are drafts)

Not a gate for this release: the re-voice of lessons 17 and 20. It is waiting on cost approval. See section 7.

## 1. Preview smoke tests — before merge

**There is no preview deployment yet.** Vercel skipped the build on both PRs ("Canceled by Ignored Build Step"). Trigger a preview deployment of the #106 branch from the Vercel dashboard first, and confirm which database it uses before doing anything that writes.

The preview runs the new code against a database that has **not** had the migrations. So only the Read tab can be checked here; grading and quiz are checked in section 5.

- [ ] `/` loads; sign in works
- [ ] `/lessons/push-back` — Read tab opens with "By the end of this lesson you can:" and has a "Where the overrule stops" section
- [ ] `/lessons/raid-logs` — Read tab opens with "By the end of this lesson you can:"; objective 1 mentions a trigger; British spelling
- [ ] Both lessons: Video, Read, Quiz and Workbook tabs open without an error
- [ ] One other lesson (for example `/lessons/coordinator-role`) still renders
- [ ] No new errors in the browser console on those pages

## 2. Merge order

1. [ ] **Merge #105 first.** It has no effect on learners, so it can be verified on its own. After the production deploy finishes, load `/` and one lesson page.
2. [ ] **Merge #106.** If GitHub asks, update the branch from `main` first (the two PRs touch different files and merge cleanly). Wait for the production deploy to finish.
3. [ ] Go straight to sections 3 to 5. Between the #106 deploy and migration 01, the lesson 17 reading and the grader disagree, so keep that gap short.

Do not use "squash and merge" on #106 if you want to keep the fix commits separate; either method works for the release.

## 3. Database — read-only checks and a restore point

Run everything in this section on a **Neon branch of production first**, then repeat on production. Use the direct (non-pooled) connection string. Every query here only reads.

- [ ] **3a. Create a Neon branch of production** named `pre-pcl-106`. This is the restore point. Keep it for at least seven days.

- [ ] **3b. Pre-check A — must pass before migration 03.** raid-logs has a non-blank scenario:

  ```sql
  select slug,
         scenario_text ~ '\S' as has_scenario,
         length(btrim(scenario_text, E' \t\r\n')) as scenario_chars
  from public.lessons
  where slug = 'raid-logs';
  ```

  Go: exactly one row with `has_scenario = true`. Stop: no row, or `has_scenario` is `false` or NULL. The repository copy of the scenario is 940 characters.

- [ ] **3c. Pre-check B — before migration 02.** Q7, Q11 and Q16 are the original items:

  ```sql
  select qi.sort, qi.is_ai_generated, qi.stem
  from public.quiz_items qi
  join public.lessons l on l.id = qi.lesson_id
  where l.slug = 'push-back' and qi.sort in (7, 11, 16)
  order by qi.sort, qi.is_ai_generated;
  ```

  Go: three hand-authored rows (`is_ai_generated = false`) with these stems:
  - 7: `If the PM considers your push-back and still says proceed, you should:`
  - 11: `The deeper failure mode the chapter warns about is:`
  - 16: `The 'say yes carefully' reframings are best understood as:`

  Extra AI-generated rows are fine; they are left alone. A different stem on a hand-authored row means that item will be skipped. Stop and decide before continuing.

- [ ] **3d. Save the rows the migrations will change.** From `psql`, in an empty folder:

  ```sql
  \copy (select * from public.lessons where slug in ('push-back', 'raid-logs')) to 'lessons.csv' csv header
  \copy (select * from public.rubrics where competency = 'pushback_judgment') to 'rubrics.csv' csv header
  \copy (select * from public.prompts where name = 'grade-pushback') to 'prompts.csv' csv header
  \copy (select qi.* from public.quiz_items qi join public.lessons l on l.id = qi.lesson_id where l.slug = 'push-back') to 'quiz_items.csv' csv header
  \copy (select wa.* from public.workbook_assignments wa join public.lessons l on l.id = wa.lesson_id where l.slug in ('push-back', 'raid-logs')) to 'workbook_assignments.csv' csv header
  ```

## 4. Apply the migrations, in this order

On the Neon branch first. Then, only if section 5 passes there, on production.

```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261111_01_pushback_judgment_v2.sql
```

```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261111_02_quiz_lesson_17_overrule_boundary.sql
```

```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f db/migrations/20261111_03_lesson_20_single_scenario.sql
```

- [ ] 01 applied — no error
- [ ] 02 applied — no error, and **no** `NOTICE: push-back quiz: n of 3 items edited`
- [ ] 03 applied — no error, and **no** `NOTICE: raid-logs has no scenario_text`

Each file is one transaction and is safe to run again. A `NOTICE` means the migration skipped something on purpose: stop and compare with pre-checks A and B.

No schema changes are involved, so `pnpm db:pull` is not needed.

## 5. Verify after the migrations

Read-only checks:

```sql
-- Expect: v1 false, v2 true, for both.
select 'rubric' as kind, version, is_current from public.rubrics where competency = 'pushback_judgment'
union all
select 'prompt', version, is_current from public.prompts where name = 'grade-pushback'
order by kind, version;
```

```sql
-- Expect: push-back = 1 default brief titled 'Board pre-read push-back — IAM modernisation';
--         raid-logs = exactly 1 brief in total, default, titled 'RAID log — healthcare systems integration pilot'.
select l.slug, wa.title, wa.is_default, wa.is_ai_generated
from public.workbook_assignments wa
join public.lessons l on l.id = wa.lesson_id
where l.slug in ('push-back', 'raid-logs')
order by l.slug, wa.sort;
```

```sql
-- Expect: 20 hand-authored items; sort 16 has correct = 'c' and difficulty = 'hard'.
select count(*) filter (where not qi.is_ai_generated) as hand_authored,
       max(qi.correct) filter (where qi.sort = 16 and not qi.is_ai_generated) as q16_correct
from public.quiz_items qi
join public.lessons l on l.id = qi.lesson_id
where l.slug = 'push-back';
```

- [ ] All three queries match their expected results

In the app (production, after the production migrations):

- [ ] `/lessons/push-back` → Workbook tab shows the board pre-read scenario; task item 3 begins "Make clear where R.'s authority applies"
- [ ] `/lessons/push-back` → Quiz: an item beginning "A status summary says a workstream is" can appear; Q7 begins "On a judgement call"
- [ ] `/lessons/raid-logs` → Workbook tab shows the healthcare systems integration pilot, not "Halcyon"
- [ ] **Live upload-and-grade check on lesson 17.** Upload a short push-back reply and confirm it is graded and the result page shows five dimensions. This makes one real grading call (a few cents of Anthropic usage), so it needs the owner's go-ahead.
- [ ] Sentry (if its DSN is set in production) shows no new errors for 30 minutes after the release; otherwise check the Vercel runtime logs

## 6. Roll back

Decide which layer failed. Roll back only that layer.

**Code (either PR).** Revert the merge commit on `main` with a new PR (`git revert -m 1 <merge-sha>` for a merge commit, `git revert <sha>` for a squash). Or, faster, promote the previous production deployment in the Vercel dashboard, then revert in git. Reverting #105 has no effect on learners.

**Migration 01 — grading back to v1.** This is the fast path and is enough to restore v1 grading:

```sql
begin;
update public.rubrics set is_current = false where competency = 'pushback_judgment' and version = 2;
update public.rubrics set is_current = true  where competency = 'pushback_judgment' and version = 1;
update public.prompts set is_current = false where name = 'grade-pushback' and version = 2;
update public.prompts set is_current = true  where name = 'grade-pushback' and version = 1;
commit;
```

Then restore `scenario_text` and `summary` for `push-back`, and the push-back default brief, from `lessons.csv` and `workbook_assignments.csv` (step 3d). The v2 rubric and prompt rows can stay; they are inert when not current.

**Migration 02 — quiz items.** Restore `stem`, `options`, `correct`, `distractor_rationale` and `difficulty` for the hand-authored items at sort 7, 11 and 16 from `quiz_items.csv`. Do **not** re-run `supabase/migrations/20260709_seed_quiz_lesson_17_pushback.sql`: it deletes every lesson 17 quiz item first, including AI-generated ones.

**Migration 03 — lesson 20 briefs.** Delete the one raid-logs brief and re-insert the saved rows from `workbook_assignments.csv`. The "seen" records for the old briefs were removed by the migration and are not restored; learners simply start from the default brief again.

**If the saved files are missing or wrong.** Read the old rows from the `pre-pcl-106` Neon branch (step 3a). Restoring the whole database from that branch also discards every learner action since the release, so use it only as a last resort.

After any rollback, re-run the section 5 queries and confirm they show the old state.

## 7. Not part of this release

- **Re-voice of lessons 17 and 20.** Waiting on cost approval. Until it is done, the live lesson 20 video and the committed narration files carry the old script, while the Read tab carries the new text. The lesson 20 SME name "Jane Doe" appears only in the new script, so learners will not hear it until the re-voice. Do not publish the lesson 17 or lesson 20 MP4s before the re-voice.
- **Publishing videos.** When the re-voiced files exist, use the script from #105, `--dry-run` first: `node scripts/seed-production-video.mjs lesson-20-raid-logs --dry-run`. Expected storage key: `lesson-videos/raid-logs/raid-logs.mp4`.
- **"New scenario" button.** It can still generate a workbook brief the grader never sees. Known app behaviour, not changed by either PR.
- **Lesson 17 scenario wording.** Production stores a condensed version of the scenario calibration used. Unchanged by this release.
