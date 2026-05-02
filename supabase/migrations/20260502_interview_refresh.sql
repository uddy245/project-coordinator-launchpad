-- Mock-interview scenario refresh: AI-augmented pool.
--
-- Same hybrid model as quiz_items: a learner-facing "↻ Generate more"
-- button calls Claude to add new scenarios to the shared pool. We don't
-- need a "seen" table here — mock_interview_responses already tracks
-- per-user attempts, so the list page can mark scenarios as attempted
-- and the user picks one to practise next.

alter table mock_interview_scenarios
  add column if not exists is_ai_generated boolean not null default false,
  add column if not exists generated_at timestamptz;
