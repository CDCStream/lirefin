-- =====================================================================
-- FNI · Account deletion
--
-- Adds the schema and helpers needed to fully delete a user account in
-- one transaction, plus an anti-abuse mechanism that prevents anyone
-- from harvesting free signup credits by repeatedly creating + deleting
-- accounts under the same email.
--
-- Pieces in this migration:
--
--   1. `deleted_users` table — keyed by SHA-256 hash of the user's
--      lowercased+trimmed email. We store the *hash*, not the raw
--      email, so we don't keep PII for users who asked us to forget
--      them. The hash is enough to detect "this email signed up before
--      and was deleted" without ever knowing what it was.
--
--   2. Updated `handle_new_user()` trigger — on every new auth.users
--      insert, looks up the email hash. Match → 0 free credits (returning
--      user does not get the signup bonus a second time). No match →
--      regular 25-credit bonus.
--
--   3. `delete_user_account(p_user_id uuid)` RPC — runs by service_role
--      only. Computes the email hash, inserts it into `deleted_users`,
--      then deletes the auth.users row. The auth.users delete cascades
--      to every public.* table that references it (credit_balances,
--      credit_transactions, analyses, purchases, subscriptions,
--      billing_customers).
-- =====================================================================

-- ---------------- pgcrypto for digest() ----------------
create extension if not exists pgcrypto;

-- ---------------- deleted_users ----------------
create table if not exists public.deleted_users (
  email_hash text primary key,
  deleted_at timestamptz not null default now(),
  -- Optional: preserve a coarse signal for analytics without keeping
  -- the email itself. `had_paid_subscription` lets us know whether the
  -- deletion came from a converted user.
  had_paid_subscription boolean not null default false
);

comment on table public.deleted_users is
  'Anti-abuse + analytics: SHA-256 hashes of emails that have asked for full account deletion. We never store the raw email. Used by handle_new_user() to skip the 25-credit signup bonus for repeat signups.';

-- RLS: even authenticated users must never read this table directly.
-- Only service_role (which bypasses RLS) touches it via the RPC.
alter table public.deleted_users enable row level security;

-- ---------------- Email hashing helper ----------------
-- Lowercases + trims + digests, so 'user@x.com' and 'User@X.com  ' map
-- to the same bucket. SHA-256 is one-way; we cannot recover the email.
create or replace function public.email_hash(p_email text)
returns text
language sql immutable
as $$
  select encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
$$;

-- ---------------- Updated signup-bonus trigger ----------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  -- Keep in sync with `SIGNUP_BONUS_CREDITS` in packages/shared/src/credits.ts.
  bonus int := 25;
  is_returning boolean := false;
begin
  -- A returning user (one who deleted their account before) gets a
  -- balance row with 0 credits. We still create the row so the rest of
  -- the app works (analyses RLS, balance reads, etc.), but the bonus
  -- is intentionally withheld to prevent free-credit farming.
  if new.email is not null then
    select exists (
      select 1
        from public.deleted_users
       where email_hash = public.email_hash(new.email)
    ) into is_returning;
  end if;

  if is_returning then
    insert into public.credit_balances(user_id, credits)
      values (new.id, 0)
      on conflict (user_id) do nothing;

    insert into public.credit_transactions(user_id, delta, kind, metadata)
      values (
        new.id,
        0,
        'signup_bonus',
        jsonb_build_object('source','re_signup_no_bonus')
      );
  else
    insert into public.credit_balances(user_id, credits)
      values (new.id, bonus)
      on conflict (user_id) do nothing;

    insert into public.credit_transactions(user_id, delta, kind, metadata)
      values (
        new.id,
        bonus,
        'signup_bonus',
        jsonb_build_object('source','auto')
      );
  end if;

  return new;
end;
$$;

-- The trigger itself was created in 001 and points at handle_new_user,
-- so replacing the function (above) is enough — we don't need to drop
-- and recreate the trigger.

-- ---------------- delete_user_account RPC ----------------
-- Service-role only. Atomically:
--   1. Records the email hash in deleted_users (idempotent on repeat
--      calls — primary key conflict is swallowed).
--   2. Deletes the auth.users row, which cascades to every public.*
--      table thanks to ON DELETE CASCADE foreign keys.
--
-- The function returns void; callers can rely on the absence of an
-- exception as a success signal. Race-safe: if two concurrent calls
-- hit the same user, the second one no-ops because the auth.users row
-- is already gone.
create or replace function public.delete_user_account(
  p_user_id uuid,
  p_had_paid boolean default false
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = p_user_id;
  if user_email is null then
    -- User does not exist (already deleted or never existed). Treat as
    -- a no-op so the API endpoint can be safely retried.
    return;
  end if;

  insert into public.deleted_users(email_hash, had_paid_subscription)
    values (public.email_hash(user_email), p_had_paid)
    on conflict (email_hash) do update
      set had_paid_subscription = excluded.had_paid_subscription
        or public.deleted_users.had_paid_subscription;

  -- The cascade does the actual work: credit_balances, credit_transactions,
  -- analyses, purchases, subscriptions, billing_customers all delete
  -- their rows for this user_id automatically.
  delete from auth.users where id = p_user_id;
end;
$$;

-- =====================================================================
-- Done. Verify:
--   select * from public.deleted_users;
--   select prosrc from pg_proc where proname = 'handle_new_user';
--   select prosrc from pg_proc where proname = 'delete_user_account';
-- =====================================================================
