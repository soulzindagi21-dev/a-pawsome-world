-- Run this in your Supabase SQL Editor to fix the "Database error saving new user" issue

-- 1. Ensure the users table has all the required columns
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  name TEXT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'CITIZEN',
  location TEXT,
  zone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns if the table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
        ALTER TABLE public.users ADD COLUMN location TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
        ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='joined_date') THEN
        ALTER TABLE public.users ADD COLUMN joined_date DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stats') THEN
        ALTER TABLE public.users ADD COLUMN stats JSONB DEFAULT '{"dogsFed": 0, "reportsSubmitted": 0, "karmaPoints": 0}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='feeding_streak') THEN
        ALTER TABLE public.users ADD COLUMN feeding_streak INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_proof_date') THEN
        ALTER TABLE public.users ADD COLUMN last_proof_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Drop NOT NULL constraints that might be causing the trigger to fail
DO $$
BEGIN
    ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;
    ALTER TABLE public.users ALTER COLUMN username DROP NOT NULL;
    ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN
        -- Ignore if columns don't exist yet
END $$;

-- 4. Recreate the trigger function with SECURITY DEFINER and robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, username, location, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'location',
    COALESCE(new.raw_user_meta_data->>'role', 'CITIZEN')
  );
  RETURN new;
END;
$$;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable RLS and create policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.users;
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access" ON public.users;
CREATE POLICY "Allow public update access" ON public.users FOR UPDATE USING (true);

-- Force Supabase to reload the schema cache
NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------
-- AI CREDIT SYSTEM
-- ------------------------------------------------------------------

-- 1. Add credits column (new users get 20 free credits automatically)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 20 NOT NULL;

-- 2. Backfill existing users who have NULL/0 from before this column existed
UPDATE public.users SET credits = 20 WHERE credits IS NULL;

-- 3. Atomic spend function - prevents race conditions / going negative
CREATE OR REPLACE FUNCTION public.spend_credits(p_user_id UUID, p_amount INT DEFAULT 1)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_balance INT;
BEGIN
  UPDATE public.users
  SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO new_balance;

  IF new_balance IS NULL THEN
    RETURN -1; -- insufficient credits (or user not found)
  END IF;

  RETURN new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INT) TO authenticated;

-- Force Supabase to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- SECURITY FIX: Lock down public.users RLS
-- The original policies used USING (true) / WITH CHECK (true), which let
-- ANY unauthenticated request read, insert, and update every user's row
-- (name, email, zone, role, credits) via the public REST API. Verified
-- exploitable 2026-08-08. Replaced with strict self-only access.
-- ------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
DROP POLICY IF EXISTS "Allow public update access" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Users can only ever see their own profile row.
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Only used as a fallback; normal signups go through the SECURITY DEFINER
-- handle_new_user() trigger, which bypasses RLS entirely.
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can only ever modify their own profile row.
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No DELETE policy: deletes remain fully denied for all non-service-role callers.

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- SECURITY FIX: Lock down public.dogs RLS
-- The dogs table (created outside this file, via the Supabase dashboard)
-- allowed anonymous INSERT and UPDATE with no restriction at all - verified
-- exploitable 2026-08-08 (anon could add fake dogs / edit medical records
-- with zero authentication). Reads stay public since a community stray-dog
-- map is meant to be publicly browsable; writes now require a logged-in
-- account. Deletes remain fully denied for all non-service-role callers,
-- same as before.
-- ------------------------------------------------------------------

-- Cleanup: remove the test row inserted during the security audit.
DELETE FROM public.dogs WHERE name = 'pentest-probe-DELETE-ME';

ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.dogs;
DROP POLICY IF EXISTS "Allow public insert access" ON public.dogs;
DROP POLICY IF EXISTS "Allow public update access" ON public.dogs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.dogs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.dogs;
DROP POLICY IF EXISTS "Enable update for all users" ON public.dogs;

-- Anyone (including logged-out visitors) can browse dogs - this is a public
-- community map, not private data.
CREATE POLICY "Anyone can read dogs" ON public.dogs
  FOR SELECT
  USING (true);

-- Only signed-in users can add or edit dog records.
CREATE POLICY "Authenticated users can insert dogs" ON public.dogs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update dogs" ON public.dogs
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- No DELETE policy: deletes remain fully denied for all non-service-role callers.

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- SECURITY FIX (v2): public.users had accumulated 14 overlapping policies
-- from prior iterations, several fully open ("Enable all access" with
-- qual=true, "Users: read all" with qual=true, etc). Since Postgres ORs all
-- permissive policies together, those alone defeated every restrictive
-- policy added earlier. Dropping ALL existing policies by name and
-- replacing with exactly 4 clean, self-only policies.
-- ------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow insert for service role" ON public.users;
DROP POLICY IF EXISTS "Allow insert via trigger" ON public.users;
DROP POLICY IF EXISTS "Enable all access" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users: admin update all" ON public.users;
DROP POLICY IF EXISTS "Users: delete own" ON public.users;
DROP POLICY IF EXISTS "Users: insert own" ON public.users;
DROP POLICY IF EXISTS "Users: read all" ON public.users;
DROP POLICY IF EXISTS "Users: update own" ON public.users;
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
DROP POLICY IF EXISTS "Allow public update access" ON public.users;

CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE
  USING (auth.uid() = id);

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- SECURITY FIX: spend_credits() had two holes, both verified exploitable
-- with the anon key (2026-08-08):
--   1. Negative p_amount subtracted a negative, i.e. ADDED unlimited
--      credits to any account (p_amount: -500 -> +500 credits).
--   2. GRANT EXECUTE ... TO authenticated does NOT revoke the implicit
--      EXECUTE grant Postgres gives to PUBLIC by default on function
--      creation, so anon could call it directly with zero auth. Also
--      hardened so a caller can only ever spend their OWN credits, even
--      once authenticated - closes a same-privilege abuse path where any
--      logged-in user could target another user's id.
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.spend_credits(p_user_id UUID, p_amount INT DEFAULT 1)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_balance INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN -1;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN -1;
  END IF;

  UPDATE public.users
  SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO new_balance;

  IF new_balance IS NULL THEN
    RETURN -1;
  END IF;

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_credits(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.spend_credits(UUID, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- SECURITY FIX: column-level lockdown on public.users
-- The RLS UPDATE policy only restricts WHICH ROW a user can touch
-- (auth.uid() = id), not WHICH COLUMNS. Verified exploitable 2026-08-08:
-- any logged-in user (no special privilege needed) could PATCH their own
-- row and set role='ADMIN' plus an arbitrary credits balance. Column-level
-- GRANTs are enforced independently of RLS and close this regardless of
-- row ownership.
-- ------------------------------------------------------------------

REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (name, zone, location, bio, notify_emergency, notify_community, public_profile)
  ON public.users TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- DIAGNOSTIC (read-only): list every policy currently active on dogs
-- ------------------------------------------------------------------
-- SELECT relname, relkind, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE relname = 'dogs' AND relnamespace = 'public'::regnamespace;
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'dogs';

-- ------------------------------------------------------------------
-- SECURITY FIX (v2): dogs had 13 policies total, including 3 literally
-- named "Public insert access" / "Public update access" / "Public read
-- access" (qual/with_check = true) - different names than the ones this
-- file's v1 fix targeted ("Allow public..."), so they survived untouched
-- and kept the table fully open. Verified exploitable 2026-08-08. Every
-- other existing policy on dogs was already correctly scoped, so only
-- the 3 wide-open ones are removed here.
-- ------------------------------------------------------------------

DROP POLICY IF EXISTS "Public insert access" ON public.dogs;
DROP POLICY IF EXISTS "Public update access" ON public.dogs;
DROP POLICY IF EXISTS "Public read access" ON public.dogs;

-- Cleanup: remove test rows inserted during the security audit.
DELETE FROM public.dogs WHERE name IN ('pentest-probe-2-DELETE-ME', 'auth-test-dog-DELETE-ME');

NOTIFY pgrst, 'reload schema';
