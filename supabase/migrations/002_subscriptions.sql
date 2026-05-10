-- =====================================================================
-- FNI · Subscriptions table
-- Tracks the user's currently-active Polar subscription so the extension
-- can show the active tier, period end, and a "manage / switch plan" CTA
-- without round-tripping to Polar on every load.
--
-- Run this in the Supabase SQL editor after 001_init_credits.sql.
-- =====================================================================

create table if not exists public.subscriptions (
  -- Polar's subscription id (unique per Polar org). We make this the primary
  -- key so webhook upserts are dead simple — no extra surrogate id, no
  -- "find by user_id" race window when a user has overlapping rows during
  -- a tier swap.
  polar_subscription_id text primary key,
  user_id              uuid not null references auth.users(id) on delete cascade,
  package_id           text not null,
  product_id           text not null,
  -- Mirror of Polar's `SubscriptionStatus`. We keep it as text rather than
  -- an enum so new statuses (e.g. `trialing`) don't require a schema
  -- migration before the webhook can store them.
  status               text not null,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- One user usually has zero or one subscriptions, but during a tier swap
-- Polar may briefly have two rows live — so we don't make user_id unique.
-- An index on (user_id, status) keeps the "find my active sub" query fast.
create index if not exists subscriptions_user_status_idx
  on public.subscriptions(user_id, status);

alter table public.subscriptions enable row level security;

drop policy if exists "subs_self_read" on public.subscriptions;
create policy "subs_self_read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- service_role bypasses RLS automatically; webhook handler writes use it.

-- ----- Updated-at maintenance -----------------------------------------
-- Tiny trigger so the row's updated_at always reflects the latest webhook
-- delivery, regardless of which fields the upsert actually changed.

create or replace function public.subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.subscriptions_set_updated_at();

-- =====================================================================
-- Done. Verify:
--   select count(*) from public.subscriptions;
-- =====================================================================
