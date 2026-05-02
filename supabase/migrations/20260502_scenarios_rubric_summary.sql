-- Add rubric_summary to mock_interview_scenarios. The admin scenario form
-- and the AI generator both write to this column; the prior remote-applied
-- mock_interviews migration omitted it, so refresh / admin upsert failed
-- with "Could not find the 'rubric_summary' column in the schema cache."
alter table public.mock_interview_scenarios
  add column if not exists rubric_summary text;
