-- =====================================================================
-- FNI · Email-hash function fix
--
-- Migration 004 created `public.email_hash(text)` that calls
-- `digest(...)` from pgcrypto. On Supabase, pgcrypto is installed in
-- the `extensions` schema (not `public`), and our security-definer
-- callers fix `search_path = public` for safety. The unqualified
-- `digest()` therefore fails with:
--
--   function digest(text, unknown) does not exist
--
-- Fix: schema-qualify the call as `extensions.digest(...)`. This is
-- the canonical Supabase pattern for pgcrypto helpers and removes the
-- search_path dependency entirely.
--
-- Idempotent: `create or replace` rewrites the function in place.
-- =====================================================================

create or replace function public.email_hash(p_email text)
returns text
language sql immutable
as $$
  select encode(extensions.digest(lower(trim(p_email)), 'sha256'), 'hex');
$$;

-- =====================================================================
-- Done. Verify:
--   select public.email_hash('test@example.com');
--   -- Expect: a 64-character hex string.
-- =====================================================================
