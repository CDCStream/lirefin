-- =====================================================================
-- FNI · Initial credit-system schema
-- Run this in the Supabase SQL editor (one-shot, idempotent).
-- =====================================================================

-- ----- Tables ---------------------------------------------------------

create table if not exists public.credit_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  credits    integer not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      integer not null,
  kind       text not null check (kind in (
    'signup_bonus','purchase','spend','refund','adjustment'
  )),
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists credit_transactions_user_idx
  on public.credit_transactions(user_id, created_at desc);

create table if not exists public.analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  url_hash      text,
  asset_count   integer not null default 0,
  word_count    integer not null default 0,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd      numeric(10,6) not null default 0,
  credits_charged integer not null default 0,
  cached        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists analyses_user_idx
  on public.analyses(user_id, created_at desc);

create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  polar_order_id  text not null unique,
  package_id      text not null,
  amount_usd      numeric(10,2) not null,
  credits         integer not null,
  status          text not null default 'pending'
                  check (status in ('pending','completed','failed')),
  created_at      timestamptz not null default now()
);

-- ----- Row Level Security --------------------------------------------

alter table public.credit_balances     enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.analyses            enable row level security;
alter table public.purchases           enable row level security;

drop policy if exists "balance_self_read"    on public.credit_balances;
drop policy if exists "tx_self_read"         on public.credit_transactions;
drop policy if exists "analyses_self_read"   on public.analyses;
drop policy if exists "purchases_self_read"  on public.purchases;

create policy "balance_self_read"   on public.credit_balances
  for select using (auth.uid() = user_id);
create policy "tx_self_read"        on public.credit_transactions
  for select using (auth.uid() = user_id);
create policy "analyses_self_read"  on public.analyses
  for select using (auth.uid() = user_id);
create policy "purchases_self_read" on public.purchases
  for select using (auth.uid() = user_id);

-- service_role bypasses RLS automatically; no insert/update policies needed.

-- ----- Signup bonus trigger ------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  -- Keep in sync with `SIGNUP_BONUS_CREDITS` in packages/shared/src/credits.ts.
  -- 25 credits ≈ 3 medium-length analyses + small buffer.
  bonus int := 25;
begin
  insert into public.credit_balances(user_id, credits)
    values (new.id, bonus)
    on conflict (user_id) do nothing;

  insert into public.credit_transactions(user_id, delta, kind, metadata)
    values (new.id, bonus, 'signup_bonus', jsonb_build_object('source','auto'));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- Atomic spend RPC ----------------------------------------------

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount  int,
  p_metadata jsonb default '{}'::jsonb
)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;

  update public.credit_balances
    set credits    = credits - p_amount,
        updated_at = now()
    where user_id = p_user_id and credits >= p_amount
    returning credits into new_balance;

  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  insert into public.credit_transactions(user_id, delta, kind, metadata)
    values (p_user_id, -p_amount, 'spend', coalesce(p_metadata, '{}'::jsonb));

  return new_balance;
end;
$$;

-- ----- Atomic add RPC (purchases / refunds / adjustments) ------------

create or replace function public.add_credits(
  p_user_id uuid,
  p_amount  int,
  p_kind    text,
  p_metadata jsonb default '{}'::jsonb
)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'AMOUNT_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;
  if p_kind not in ('purchase','refund','adjustment','signup_bonus') then
    raise exception 'INVALID_KIND' using errcode = 'P0001';
  end if;

  insert into public.credit_balances(user_id, credits)
    values (p_user_id, p_amount)
    on conflict (user_id)
      do update set credits    = credit_balances.credits + excluded.credits,
                    updated_at = now()
    returning credits into new_balance;

  insert into public.credit_transactions(user_id, delta, kind, metadata)
    values (p_user_id, p_amount, p_kind, coalesce(p_metadata, '{}'::jsonb));

  return new_balance;
end;
$$;

-- =====================================================================
-- Done. Verify:
--   select count(*) from public.credit_balances;
--   select * from public.credit_transactions order by created_at desc limit 5;
-- =====================================================================
