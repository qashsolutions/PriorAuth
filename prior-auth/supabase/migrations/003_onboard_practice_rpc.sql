-- ============================================================
-- RPC: onboard_practice
--
-- Creates a practice + profile in one atomic call.
-- Uses SECURITY DEFINER to bypass RLS (solves the chicken-and-egg
-- problem where you need a profile to SELECT the practice back,
-- but need the practice ID to create the profile).
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

CREATE OR REPLACE FUNCTION public.onboard_practice(
  p_npi text,
  p_name text,
  p_specialty text,
  p_address text,
  p_full_name text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_practice_id uuid;
BEGIN
  -- Create practice
  INSERT INTO public.practices (npi, name, specialty, address)
  VALUES (p_npi, p_name, p_specialty, p_address)
  RETURNING id INTO v_practice_id;

  -- Create profile linked to practice
  INSERT INTO public.profiles (id, practice_id, full_name, role)
  VALUES (auth.uid(), v_practice_id, p_full_name, p_role);

  RETURN v_practice_id;
END;
$$;
