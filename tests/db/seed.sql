-- Minimal reference data for integration tests. No production rows: the
-- replica is schema-only (tests/db/neon-schema.sql). Tests create and clean
-- up their own users.
insert into public.lessons (slug, number, title, summary, competency, prompt_name, is_published, is_preview) values
  ('coordinator-role', 1, 'The Coordinator Role', 'What a project coordinator does.', 'role_understanding', 'grade-role', true, true),
  ('project-lifecycle', 2, 'Project Lifecycle', 'Phases of a project.', 'lifecycle_awareness', 'grade-lifecycle', true, false),
  ('raid-logs', 20, 'RAID Logs', 'Risks, assumptions, issues and dependencies.', 'risk_identification', 'grade-raid', true, false),
  ('unpublished-draft', 99, 'Draft Lesson', 'Not yet published.', 'role_understanding', 'grade-role', false, false);

insert into public.quiz_items (lesson_id, sort, stem, options, correct, distractor_rationale, competency, difficulty)
select l.id, 1, 'Who owns the project schedule?',
  '[{"id":"a","text":"The coordinator"},{"id":"b","text":"The sponsor"}]'::jsonb,
  'a', '{"a":"Right.","b":"Sponsors approve, not maintain."}'::jsonb, 'role_understanding', 'easy'
from public.lessons l where l.slug = 'coordinator-role';
