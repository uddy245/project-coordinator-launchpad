-- Already applied to prod (2026-06-29). This file exists for repo parity only.
-- conversation_id was added directly and existing rows were backfilled into one
-- thread per user. The `add column if not exists` and `create index if not exists`
-- guards make it safe to run but it is a no-op on an up-to-date database.

alter table public.tutor_messages
  add column if not exists conversation_id uuid;

create index if not exists tutor_messages_conversation_idx
  on public.tutor_messages (conversation_id, created_at);
