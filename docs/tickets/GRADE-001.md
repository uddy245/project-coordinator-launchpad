# GRADE-001: submissions + rubric_scores + audit tables

**Milestone:** M4 Grading
**Dependencies:** LES-001, AUTH-004
**Estimated session length:** medium (30–90 min)
**Status:** not started

## Context

Schema backbone for the grading pipeline. Four tables with strict RLS:

- `submissions` — one per artifact upload, includes storage path + extracted text + status
- `rubric_scores` — one row per (submission, dimension), plus token counts and model/prompt version tags
- `audit_queue` — 10% sample + learner-requested reviews
- `audit_records` — append-only log of admin review decisions and overrides

Original AI scores in `rubric_scores` are never mutated after grading — overrides live in `audit_records` and are applied at display time.

## Files to create

- `supabase/migrations/20260110_submissions.sql`
- `tests/integration/submissions-rls.test.ts`

## Schema (summary)

```sql
create type submission_status as enum (
  'pending', 'grading', 'graded', 'grading_failed', 'manual_review'
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  extracted_text text,
  status submission_status not null default 'pending',
  overall_score numeric(3,2),
  pass boolean,
  hire_ready boolean,
  submitted_at timestamptz default now(),
  graded_at timestamptz
);

create table public.rubric_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  rubric_id uuid references public.rubrics(id),
  dimension text not null,
  score integer not null check (score between 1 and 5),
  justification text not null,
  quote text,
  suggestion text,
  model text not null,
  prompt_version integer not null,
  input_tokens integer,
  output_tokens integer,
  unique (submission_id, dimension)
);

create type audit_status as enum ('pending', 'approved', 'overridden');

create table public.audit_queue (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid unique references public.submissions(id) on delete cascade,
  reason text not null check (reason in ('sampled', 'requested')),
  status audit_status not null default 'pending',
  created_at timestamptz default now()
);

create table public.audit_records (
  id uuid primary key default gen_random_uuid(),
  audit_queue_id uuid references public.audit_queue(id) on delete cascade,
  reviewer_id uuid references auth.users(id),
  decision audit_status not null,
  overrides jsonb,
  note text,
  decided_at timestamptz default now()
);
```

## Acceptance criteria

- [ ] All four tables + the two enum types exist on prod Supabase
- [ ] RLS enabled on all four
- [ ] Users SELECT own submissions/rubric_scores; admins SELECT all
- [ ] Only service role writes to submissions/rubric_scores/audit_queue (grading path); admin writes to audit_records via policy
- [ ] `rubric_scores` unique constraint on `(submission_id, dimension)` prevents double-scoring
- [ ] `audit_queue` unique constraint on `submission_id` — each submission queued at most once

## Tests required

- [ ] Integration: user A cannot SELECT user B's submission or rubric_scores; admin can

## Definition of done

- [ ] Migration applied to prod Supabase
- [ ] `pnpm test` and `pnpm typecheck` and `pnpm lint` clean
- [ ] PR merged
