-- Lock down row-level security: RLS is enabled but every existing policy
-- used USING (true) for both anon and authenticated, meaning anyone without a
-- login could read/write/delete every row. This migration:
--   1. Drops those "everyone" policies.
--   2. Revokes the anon GRANTs on all five tables (service_role keeps ALL,
--      authenticated keeps only the verbs each table needs).
--   3. Adds a created_by column (auth.uid()) to cases, reviews and diagnoses.
--   4. Scopes all normal access to authenticated users:
--        - SELECT  => authenticated (shared classroom view, auth.uid() IS NOT NULL)
--        - INSERT  => authenticated (auth.uid() IS NOT NULL)
--        - UPDATE  => authenticated where auth.uid() = created_by
--        - DELETE  => authenticated where auth.uid() = created_by
--   5. Keeps the is_demo seed rows readable by everyone (including anon) via a
--      narrow policy scoped to is_demo = true.

-- ---------------------------------------------------------------------------
-- 1. Drop the old permissive policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cases readable by everyone" ON public.cases;
DROP POLICY IF EXISTS "cases insertable by everyone" ON public.cases;
DROP POLICY IF EXISTS "cases updatable by everyone" ON public.cases;
DROP POLICY IF EXISTS "cases deletable by everyone" ON public.cases;

DROP POLICY IF EXISTS "diagnoses readable by everyone" ON public.diagnoses;
DROP POLICY IF EXISTS "diagnoses insertable by everyone" ON public.diagnoses;

DROP POLICY IF EXISTS "reviews readable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "reviews insertable by everyone" ON public.reviews;

DROP POLICY IF EXISTS "rule checks readable by everyone" ON public.rule_check_results;
DROP POLICY IF EXISTS "rule checks insertable by everyone" ON public.rule_check_results;
DROP POLICY IF EXISTS "rule checks deletable by everyone" ON public.rule_check_results;

DROP POLICY IF EXISTS "ai logs readable by everyone" ON public.responsible_ai_logs;
DROP POLICY IF EXISTS "ai logs insertable by everyone" ON public.responsible_ai_logs;

-- ---------------------------------------------------------------------------
-- 2. Revoke anon grants; keep service_role ALL and authenticated verbs
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.cases FROM anon;
REVOKE ALL ON public.diagnoses FROM anon;
REVOKE ALL ON public.reviews FROM anon;
REVOKE ALL ON public.rule_check_results FROM anon;
REVOKE ALL ON public.responsible_ai_logs FROM anon;

-- Keep service_role with full access (used by trusted server-side operations).
GRANT ALL ON public.cases TO service_role;
GRANT ALL ON public.diagnoses TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.rule_check_results TO service_role;
GRANT ALL ON public.responsible_ai_logs TO service_role;

-- Keep only the verbs each table actually needs for authenticated users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT SELECT, INSERT ON public.diagnoses TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.rule_check_results TO authenticated;
GRANT SELECT, INSERT ON public.responsible_ai_logs TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Add created_by columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE public.diagnoses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- ---------------------------------------------------------------------------
-- 4. New RLS policies scoped to authenticated users
-- ---------------------------------------------------------------------------
-- cases: SELECT/INSERT for any authenticated user (shared classroom view),
-- but only the creator can UPDATE/DELETE their own rows.
CREATE POLICY "cases read via authenticated" ON public.cases
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "cases insert via authenticated" ON public.cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cases update own via authenticated" ON public.cases
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "cases delete own via authenticated" ON public.cases
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- diagnoses: SELECT/INSERT for any authenticated user. No UPDATE/DELETE is
-- needed by the app (a diagnosis is stored immutably).
CREATE POLICY "diagnoses read via authenticated" ON public.diagnoses
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "diagnoses insert via authenticated" ON public.diagnoses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- reviews: SELECT/INSERT for any authenticated user, creator-only UPDATE/DELETE.
CREATE POLICY "reviews read via authenticated" ON public.reviews
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "reviews insert via authenticated" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "reviews update own via authenticated" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "reviews delete own via authenticated" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- rule_check_results: SELECT/INSERT/DELETE for any authenticated user. This is
-- a shared tool table; saving new checks relies on replace-by-delete semantics.
CREATE POLICY "rule checks read via authenticated" ON public.rule_check_results
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "rule checks insert via authenticated" ON public.rule_check_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "rule checks delete via authenticated" ON public.rule_check_results
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- responsible_ai_logs: SELECT/INSERT only for any authenticated user.
CREATE POLICY "ai logs read via authenticated" ON public.responsible_ai_logs
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai logs insert via authenticated" ON public.responsible_ai_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 5. Keep demo seed rows readable by everyone, including anon
-- ---------------------------------------------------------------------------
CREATE POLICY "cases demo readable by anon" ON public.cases
  FOR SELECT TO anon USING (is_demo = true);

CREATE POLICY "cases demo readable by authenticated" ON public.cases
  FOR SELECT TO authenticated USING (is_demo = true);
