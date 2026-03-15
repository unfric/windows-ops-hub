-- Fix handle_new_user trigger to support invited users from any domain.
-- Using is_admin_invite flag in user_metadata as a more reliable check.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. If it's an admin invite (detected via metadata or invited_at), allow it.
  IF (
    NEW.invited_at IS NOT NULL OR 
    (NEW.raw_user_meta_data->>'is_admin_invite')::boolean IS TRUE
  ) THEN
    RETURN NEW;
  END IF;

  -- 2. Self-signup path: enforce domain restriction
  IF NEW.email NOT LIKE '%@mywindow.co.in' THEN
    RAISE EXCEPTION 'Registration restricted to @mywindow.co.in domain';
  END IF;

  -- 3. Create profile for self-signup
  INSERT INTO public.profiles (user_id, name, email, status, joined_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'active',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    joined_at = COALESCE(profiles.joined_at, now()),
    name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), profiles.name);

  RETURN NEW;
END;
$$;
