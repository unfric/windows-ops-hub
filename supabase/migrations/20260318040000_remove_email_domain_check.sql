-- Migration: Remove email domain restriction for user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Replaced restrictive domain check to allow generic registration
  INSERT INTO public.profiles (user_id, name, email, status, joined_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, 'active', now())
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    joined_at = COALESCE(profiles.joined_at, now()),
    name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), profiles.name);
  RETURN NEW;
END;
$$;
