-- Add an opt-in flag for weekly digest emails. Defaults to true so all
-- existing learners get the digest unless they've opted out via profile
-- settings. Cron route at /api/cron/weekly-digest reads this column.

alter table public.profiles
  add column if not exists weekly_digest_opt_in boolean not null default true;

comment on column public.profiles.weekly_digest_opt_in is
  'Per-user opt-in for the Sunday weekly digest email. Default true.';
