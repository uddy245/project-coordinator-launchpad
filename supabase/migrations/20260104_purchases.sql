-- ==========================================================================
-- Migration: 20260104_purchases.sql
-- Ticket: PAY-002
-- Purpose: Record of Stripe payments. Written by the webhook using the
--          service-role key (bypasses RLS). Users can read their own rows.
--          The unique constraint on stripe_session_id is what makes the
--          webhook idempotent — duplicate delivery of the same event
--          cannot double-grant access.
-- ==========================================================================

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in ('paid', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

create index purchases_user_id_idx on public.purchases (user_id);

alter table public.purchases enable row level security;

-- Users can see their own purchases. Admins see all via is_admin().
create policy "users read own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "admins manage purchases"
  on public.purchases for all
  using (public.is_admin())
  with check (public.is_admin());

-- No insert/update/delete policies for authenticated users — only the
-- service_role key (which bypasses RLS) writes here. This is the whole
-- point of the column-level grant model: the UI never writes purchases.

comment on table public.purchases is
  'Stripe payment records. Written only by the webhook using service_role. '
  'Unique stripe_session_id guarantees webhook idempotency.';
