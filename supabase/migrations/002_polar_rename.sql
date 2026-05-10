-- =====================================================================
-- Lirefin · Migrate purchases table from Stripe → Polar.sh
--
-- Run this ONLY if you originally deployed 001_init_credits.sql before
-- the Polar.sh switchover (i.e. the `purchases` table still has a
-- `stripe_session_id` column). Fresh installs already get the renamed
-- column from 001 so this file is a safe no-op for them.
-- =====================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'purchases'
      and column_name  = 'stripe_session_id'
  ) then
    alter table public.purchases
      rename column stripe_session_id to polar_order_id;
  end if;
end
$$;

-- Verify:
--   \d public.purchases
--   should show `polar_order_id text not null unique`
