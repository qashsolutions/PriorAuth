-- ============================================================
-- Fix: infinite recursion in RLS policies
--
-- Problem: profiles SELECT policy references profiles table,
-- which triggers the same policy again → infinite loop.
-- Same pattern in practices, invitations, audit_logs policies
-- that subquery profiles.
--
-- Solution: SECURITY DEFINER helper functions bypass RLS
-- when looking up the current user's practice_id and role.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Helper functions (bypass RLS via SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.get_my_practice_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT practice_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Drop the broken policies

DROP POLICY IF EXISTS "Users can view own practice"          ON public.practices;
DROP POLICY IF EXISTS "Providers can update own practice"    ON public.practices;
DROP POLICY IF EXISTS "Users can view same-practice profiles" ON public.profiles;
DROP POLICY IF EXISTS "Providers can manage invitations"     ON public.invitations;
DROP POLICY IF EXISTS "Users can view own practice audit logs" ON public.audit_logs;

-- 3. Recreate policies using helper functions (no recursion)

-- Practices
CREATE POLICY "Users can view own practice"
  ON public.practices FOR SELECT
  USING (id = public.get_my_practice_id());

CREATE POLICY "Providers can update own practice"
  ON public.practices FOR UPDATE
  USING (id = public.get_my_practice_id()
         AND public.get_my_role() IN ('provider', 'admin'));

-- Profiles
CREATE POLICY "Users can view same-practice profiles"
  ON public.profiles FOR SELECT
  USING (practice_id = public.get_my_practice_id()
         OR id = auth.uid());

-- Invitations
CREATE POLICY "Providers can manage invitations"
  ON public.invitations FOR ALL
  USING (practice_id = public.get_my_practice_id()
         AND public.get_my_role() IN ('provider', 'admin'));

-- Audit logs
CREATE POLICY "Users can view own practice audit logs"
  ON public.audit_logs FOR SELECT
  USING (practice_id = public.get_my_practice_id()
         AND public.get_my_role() IN ('provider', 'admin'));
