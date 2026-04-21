-- ==========================================================================
-- Migration: 20260421_lessons_competency_columns.sql
-- Ticket: A1 (post-MVP net-new-lesson enablement)
-- Purpose: Make the lessons table carry its own competency + prompt_name
-- so gradeSubmission can look up the right rubric + prompt per lesson,
-- instead of hardcoding "risk_identification" / "grade-raid" in code.
-- ==========================================================================

-- 1. Add columns nullable so existing rows don't break the constraint.
alter table public.lessons
  add column competency text,
  add column prompt_name text;

-- 2. Backfill Lesson 20 (the only seeded lesson). Other lessons don't
-- exist yet; when they're seeded by the new-lesson pattern they'll
-- populate these columns directly.
update public.lessons
  set competency = 'risk_identification',
      prompt_name = 'grade-raid'
  where slug = 'raid-logs';

-- 3. Enforce NOT NULL once the backfill is in. Future lesson seeds
-- must set these columns or the insert fails loud.
alter table public.lessons
  alter column competency set not null,
  alter column prompt_name set not null;

-- 4. Documentation hints on the columns.
comment on column public.lessons.competency is
  'The rubric.competency this lesson is graded against. Determines which rubric row (where is_current=true) the grader loads.';
comment on column public.lessons.prompt_name is
  'The prompts.name this lesson uses for grading. Determines which prompt row (where is_current=true) the grader loads.';
