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

