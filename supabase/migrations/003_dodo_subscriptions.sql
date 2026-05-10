-- =====================================================================
-- FNI · DodoPayments migration
--
-- Replaces the Polar-shaped `subscriptions` / `purchases` columns with a
-- provider-agnostic schema. The `polar_*` ids stay archived in the old
-- columns (renamed) so we can still trace historical Polar orders if a
-- chargeback / refund question comes up later, but every NEW write uses
-- the new columns.
--
-- A separate `billing_customers` table maps each Supabase user to their
-- Dodo customer_id (`cus_…`). Dodo's subscriptions.list filter only
-- supports `customer_id`, so we MUST persist this mapping ourselves.
-- The mapping is seeded by the first webhook delivery (see routes/
-- billing.ts) so it is eventually consistent rather than being created
-- at checkout time.
--
-- Run this in the Supabase SQL editor after 002_subscriptions.sql.
-- =====================================================================

-- ---------------- subscriptions: rename + add ---------------------
-- We keep the row-per-subscription PK semantics (one row = one Dodo
-- subscription_id). The `polar_subscription_id` column is renamed to
-- `subscription_id` (provider-agnostic) and a new `customer_id` column
-- is added so we can resolve "find latest sub for this user" without
-- pulling every subscription from Dodo. A nullable `provider` column
-- lets the webhook handler distinguish historical Polar rows.

alter table public.subscriptions
  rename column polar_subscription_id to subscription_id;

alter table public.subscriptions
  add column if not exists customer_id text,
  add column if not exists provider   text not null default 'polar';

-- New rows (Dodo) will set provider='dodo' explicitly. Existing rows
-- keep the default 'polar'. After verification we can drop the default
-- so every insert must declare its provider.

create index if not exists subscriptions_customer_id_idx
  on public.subscriptions(customer_id)
  where customer_id is not null;

-- ---------------- purchases: rename + add ---------------------
-- The `purchases` table records every successful payment — both
-- one-time top-ups (Polar) and recurring subscription renewals (Dodo).
-- We rename `polar_order_id` → `provider_order_id` and add a `provider`
-- column for the same archive-then-migrate pattern.

alter table public.purchases
  rename column polar_order_id to provider_order_id;

alter table public.purchases
  add column if not exists provider text not null default 'polar';

-- ---------------- billing_customers (NEW) ---------------------
-- One row per Supabase user that has ever subscribed. We populate
-- `dodo_customer_id` from the first `subscription.active` webhook so we
-- can short-circuit "list my subscriptions" without scanning every
-- customer Dodo has. `polar_customer_id` is kept null but reserved in
-- case we ever need to backfill historical Polar customers.

create table if not exists public.billing_customers (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  dodo_customer_id  text,
  polar_customer_id text,
  email             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists billing_customers_dodo_idx
  on public.billing_customers(dodo_customer_id)
  where dodo_customer_id is not null;

alter table public.billing_customers enable row level security;

drop policy if exists "billing_customers_self_read" on public.billing_customers;
create policy "billing_customers_self_read" on public.billing_customers
  for select using (auth.uid() = user_id);

-- service_role bypasses RLS automatically; webhook handler writes use it.

create or replace function public.billing_customers_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists billing_customers_updated_at on public.billing_customers;
create trigger billing_customers_updated_at
  before update on public.billing_customers
  for each row execute function public.billing_customers_set_updated_at();

-- =====================================================================
-- Done. Verify:
--   select column_name, data_type from information_schema.columns
--    where table_name = 'subscriptions';
--   select column_name from information_schema.columns
--    where table_name = 'billing_customers';
-- =====================================================================
