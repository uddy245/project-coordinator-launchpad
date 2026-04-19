-- ==========================================================================
-- Migration: 20260110_submissions.sql
-- Ticket: GRADE-001
-- Purpose: Grading pipeline schema — submissions, rubric_scores,
--          audit_queue, audit_records.
--
-- Invariants worth calling out:
--   - rubric_scores is append-only after grading completes (never updated);
--     overrides live in audit_records and are merged at display time.
--   - Unique(submission_id, dimension) on rubric_scores prevents a grader
--     retry from producing double-scored dimensions.
--   - audit_queue has a unique submission_id constraint — a submission
--     can only be queued once. Re-queueing is blocked; new review cycles
--     would require a new submission.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type public.submission_status as enum (
  'pending', 'grading', 'graded', 'grading_failed', 'manual_review'
);

create type public.audit_status as enum ('pending', 'approved', 'overridden');

create type public.audit_reason as enum ('sampled', 'requested');

-- --------------------------------------------------------------------------
-- submissions
-- --------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  extracted_text text,
  status public.submission_status not null default 'pending',
  overall_score numeric(3, 2),
  pass boolean,
  hire_ready boolean,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz
);

create index submissions_user_idx on public.submissions (user_id, submitted_at desc);
create index submissions_lesson_idx on public.submissions (lesson_id);
create index submissions_status_idx on public.submissions (status) where status in ('pending', 'grading');

alter table public.submissions enable row level security;

create policy "users read own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);

create policy "users insert own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

-- No UPDATE / DELETE policies for authenticated users. The grading path
-- runs as service_role (bypasses RLS), so mutations after submit are
-- system-only. Admins manage via a separate policy.
create policy "admins manage submissions"
  on public.submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- rubric_scores
-- --------------------------------------------------------------------------
create table public.rubric_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  rubric_id uuid not null references public.rubrics(id) on delete restrict,
  dimension text not null,
  score integer not null check (score between 1 and 5),
  justification text not null,
  quote text,
  suggestion text,
  model text not null,
  prompt_version integer not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  unique (submission_id, dimension)
);

create index rubric_scores_submission_idx on public.rubric_scores (submission_id);

alter table public.rubric_scores enable row level security;

create policy "users read own rubric_scores"
  on public.rubric_scores for select
  using (
    exists (
      select 1 from public.submissions s
      where s.id = rubric_scores.submission_id and s.user_id = auth.uid()
    )
  );

create policy "admins manage rubric_scores"
  on public.rubric_scores for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- audit_queue
-- --------------------------------------------------------------------------
create table public.audit_queue (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  reason public.audit_reason not null,
  status public.audit_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index audit_queue_status_idx on public.audit_queue (status) where status = 'pending';

alter table public.audit_queue enable row level security;

-- Only admins read/write the audit queue. Learners "request review"
-- through a dedicated server action that runs with service_role.
create policy "admins manage audit_queue"
  on public.audit_queue for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------------------
-- audit_records — append-only decision log
-- --------------------------------------------------------------------------
create table public.audit_records (
  id uuid primary key default gen_random_uuid(),
  audit_queue_id uuid not null references public.audit_queue(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision public.audit_status not null,
  overrides jsonb,
  note text,
  decided_at timestamptz not null default now()
);

create index audit_records_queue_idx on public.audit_records (audit_queue_id, decided_at desc);

alter table public.audit_records enable row level security;

create policy "admins manage audit_records"
  on public.audit_records for all
  using (public.is_admin())
  with check (public.is_admin());

-- Learner can SEE the decision about their own submission (so the
-- "reviewed by human" badge on submission detail works).
create policy "users read own audit_records"
  on public.audit_records for select
  using (
    exists (
      select 1 from public.audit_queue q
      join public.submissions s on s.id = q.submission_id
      where q.id = audit_records.audit_queue_id and s.user_id = auth.uid()
    )
  );

comment on table public.submissions is
  'Artifact uploads, one per learner per attempt. Status drives UI state.';
comment on table public.rubric_scores is
  'Per-dimension AI scores. Append-only after grading — overrides live in audit_records.';
comment on table public.audit_queue is
  'Pending human reviews. 10% sampled + learner-requested.';
comment on table public.audit_records is
  'Append-only decision log for audit reviews.';
