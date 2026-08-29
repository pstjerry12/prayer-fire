-- ─────────────────────────────────────────────────────────────────────────────
-- Prayer Fire Movement — Row Level Security
--
-- Run this against Supabase (SQL editor, or `psql "$DATABASE_URL" -f rls.sql`).
-- It is idempotent: safe to re-run.
--
-- ⚠️  IMPORTANT: `drizzle-kit push` DISABLES row level security on the tables it
-- touches. After every `npx drizzle-kit push --force`, re-run this file:
--
--     psql "$DATABASE_URL" -f supabase/rls.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DESIGN
--
-- The Next.js server is the only thing that talks to Postgres directly, and it
-- connects as the `postgres` role — the OWNER of these tables. In PostgreSQL a
-- table owner is exempt from RLS unless the table has FORCE ROW LEVEL SECURITY,
-- so the app is completely unaffected by everything below.
--
-- These policies exist to lock the tables against the *other* way in:
-- Supabase's anon / authenticated roles over the PostgREST API (i.e. anyone
-- with the public `anon` key and the project URL).
--
-- The rule applied to each table:
--   • public content   → RLS ON + read-only policy (only published/approved rows)
--   • private/server   → RLS ON + NO policies at all = deny everything
--
-- Table            | RLS | Policies      | Why
-- -----------------|-----|---------------|-------------------------------------------
-- announcements    | ON  | 1 (SELECT)    | shown on the public home page
-- events           | ON  | 1 (SELECT)    | upcoming global prayer events
-- testimonials     | ON  | 1 (SELECT)    | approved testimonials only
-- partner_requests | ON  | 1 (SELECT)    | approved prayer requests only
-- users            | ON  | none          | emails, phone numbers, password hashes
-- donations        | ON  | none          | giving history + Paystack references
-- app_settings     | ON  | none          | holds the Paystack SECRET key
--
-- Total: 7 tables protected by RLS, 4 read-only policies. The three zero-policy
-- tables are not an oversight — with RLS enabled and no matching policy, the
-- anon key gets *nothing*, which is exactly what those tables need.
--
-- Note: `service_role` policies are deliberately omitted. Supabase's
-- service_role already has the BYPASSRLS attribute, so such policies would be
-- dead code.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS on every table (default deny).
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings      ENABLE ROW LEVEL SECURITY;

-- 2. Public, curated, read-only content.
DROP POLICY IF EXISTS "public read announcements" ON public.announcements;
CREATE POLICY "public read announcements" ON public.announcements
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read events" ON public.events;
CREATE POLICY "public read events" ON public.events
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read approved testimonials" ON public.testimonials;
CREATE POLICY "public read approved testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (approved = true);

DROP POLICY IF EXISTS "public read approved partner_requests" ON public.partner_requests;
CREATE POLICY "public read approved partner_requests" ON public.partner_requests
  FOR SELECT TO anon, authenticated USING (approved = true);

-- 3. users / donations / app_settings get NO policies on purpose.
--    Make sure nobody ever adds one, e.g. an "anon can read settings" policy
--    would leak the Paystack secret key.

-- 4. Verification query — run after applying.
--    Expect rowsecurity = t on all 7 tables and exactly 4 policies.
--
--    SELECT t.tablename,
--           t.rowsecurity,
--           count(p.policyname) AS policies
--    FROM pg_tables t
--    LEFT JOIN pg_policies p
--      ON p.schemaname = t.schemaname AND p.tablename = t.tablename
--    WHERE t.schemaname = 'public'
--    GROUP BY 1, 2
--    ORDER BY 1;
