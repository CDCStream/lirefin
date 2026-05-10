-- =====================================================================
-- FNI · Account deletion fix
--
-- Migration 004 introduced `delete_user_account()` that tried to do
-- both `insert into deleted_users` AND `delete from auth.users` in one
-- transaction. The auth.users delete failed in production with a
-- generic 500 — Supabase's internal triggers / GoTrue protections
-- on auth.users mean a custom plpgsql function cannot reliably erase
-- a user end-to-end. The canonical Supabase pattern is to call
-- `supabase.auth.admin.deleteUser()` from the service-role JS client
-- and let GoTrue handle the auth-table teardown (sessions, identities,
-- refresh tokens, MFA factors, etc.).
--
-- This migration:
--   1. Adds `record_user_deletion()` — narrower RPC that ONLY records
--      the email hash in deleted_users (the anti-abuse half of the old
--      flow). The route is going to call this BEFORE calling
--      `auth.admin.deleteUser()` from the JS client.
--   2. Drops the old `delete_user_account()` to make sure no caller is
--      tempted to keep using the broken path.
--
-- Idempotent and safe to run multiple times.
-- =====================================================================

create or replace function public.record_user_deletion(
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
    -- The user is already gone (or never existed). Nothing to record;
    -- the caller will see this as a no-op success.
    return;
  end if;

  insert into public.deleted_users(email_hash, had_paid_subscription)
    values (public.email_hash(user_email), p_had_paid)
    on conflict (email_hash) do update
      set had_paid_subscription = excluded.had_paid_subscription
        or public.deleted_users.had_paid_subscription;
end;
$$;

-- Drop the broken predecessor so a stale caller can't accidentally
-- invoke it. `if exists` keeps the migration idempotent.
drop function if exists public.delete_user_account(uuid, boolean);

-- =====================================================================
-- Done. Verify:
--   select prosrc from pg_proc where proname = 'record_user_deletion';
--   select count(*) from pg_proc where proname = 'delete_user_account';
--   -- Expect 1 row from the first query, 0 rows from the second.
-- =====================================================================
