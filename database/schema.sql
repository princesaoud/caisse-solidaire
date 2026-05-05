-- ============================================================
-- Caisse Solidaire OnPoint — Supabase Schema
-- Run this ONCE in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username       TEXT UNIQUE NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  group_name     TEXT CHECK (group_name IN ('alhassane', 'youssouf')),
  is_first_login BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. COTISATIONS TABLE
CREATE TABLE IF NOT EXISTS public.cotisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount      DECIMAL(12,2),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'exempt')),
  comment     TEXT,
  updated_by  UUID REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, year, month)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_cotisations_profile ON public.cotisations(profile_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_period  ON public.cotisations(year, month);
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON public.profiles(username);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotisations ENABLE ROW LEVEL SECURITY;

-- profiles: own row + admins see all
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);

-- cotisations: own + admins
DROP POLICY IF EXISTS "cotisations_select" ON public.cotisations;
CREATE POLICY "cotisations_select" ON public.cotisations FOR SELECT USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "cotisations_insert" ON public.cotisations;
CREATE POLICY "cotisations_insert" ON public.cotisations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "cotisations_update" ON public.cotisations;
CREATE POLICY "cotisations_update" ON public.cotisations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- 5. HELPER FUNCTIONS

-- Get email by username (used for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT u.email INTO v_email
  FROM public.profiles pr
  JOIN auth.users u ON u.id = pr.user_id
  WHERE pr.username = p_username;
  RETURN v_email;
END;
$$;

-- Check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(
  p_username TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = p_username
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_email_by_username  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available  TO anon, authenticated;
GRANT ALL ON public.profiles    TO authenticated;
GRANT ALL ON public.cotisations TO authenticated;

-- ============================================================
-- DONE! Now deploy the app and run /admin/seed to import data.
-- ============================================================
