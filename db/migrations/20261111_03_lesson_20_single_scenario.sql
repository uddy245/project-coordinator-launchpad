-- ==========================================================================
-- Migration: 20261111_03_lesson_20_single_scenario.sql
-- Target: Neon pc-launchpad. Review, run on a branch first, then production.
--
-- Lesson 20 (raid-logs): learners and the grader use ONE scenario.
--
-- Before: the grader received lessons.scenario_text (healthcare systems
-- integration pilot; the 35 risk_identification calibration fixtures are
-- written against it), while the Workbook tab showed learners a different
-- default brief ("Halcyon" cloud migration, seeded by
-- supabase/migrations/20260502_seed_default_workbook_briefs.sql). A learner's
-- log was graded against a project they had not written about.
--
-- After: every workbook brief for raid-logs is removed — the Halcyon default
-- and any AI-generated alternatives — and the one default brief is the
-- lesson's own scenario_text. lessons.scenario_text is not changed.
-- workbook_assignment_seen rows for the removed briefs go with them
-- (ON DELETE CASCADE), so every learner falls back to the default.
--
-- Not covered here: the "New scenario" button can still generate a fresh
-- brief once the pool is exhausted. That is app behaviour, not data.
--
-- Guard: the delete and the insert share one precondition — the lesson has
-- a non-blank scenario_text. Where it does not (a fresh or test database),
-- there is no grader scenario to unify on, so the existing briefs are left
-- exactly as they are and a NOTICE says so. Without the guard a NULL
-- scenario aborted on workbook_assignments.brief NOT NULL, and a blank one
-- replaced every brief with an empty default.
-- Idempotent: safe to re-run in either state.
-- ==========================================================================

begin;

do $$
begin
  if exists (
    select 1 from public.lessons l
    where l.slug = 'raid-logs' and coalesce(l.scenario_text, '') !~ '\S'
  ) then
    raise notice 'raid-logs has no scenario_text: workbook briefs left unchanged';
  end if;
end $$;

delete from public.workbook_assignments wa
using public.lessons l
where l.slug = 'raid-logs' and wa.lesson_id = l.id
  and l.scenario_text ~ '\S';

insert into public.workbook_assignments (lesson_id, title, brief, is_default, is_ai_generated, sort)
select l.id, 'RAID log — healthcare systems integration pilot', btrim(l.scenario_text, E' \t\r\n'), true, false, 1
from public.lessons l
where l.slug = 'raid-logs'
  and l.scenario_text ~ '\S';

commit;
