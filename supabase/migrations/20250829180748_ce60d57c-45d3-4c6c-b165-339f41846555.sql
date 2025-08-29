-- Create a trigger to automatically create user profile and account on first login
-- First, create the trigger function that will run when a user is authenticated
CREATE OR REPLACE FUNCTION public.create_user_profile_and_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  account_uuid uuid;
  user_metadata jsonb;
BEGIN
  -- Get user metadata
  user_metadata := NEW.raw_user_meta_data;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Create a new account first
  INSERT INTO public.accounts (name, slug)
  VALUES (
    COALESCE(user_metadata->>'account_name', user_metadata->>'full_name', 'Account'), 
    LOWER(REPLACE(COALESCE(user_metadata->>'account_name', user_metadata->>'full_name', 'account-' || substring(NEW.id::text from 1 for 8)), ' ', '-'))
  )
  RETURNING id INTO account_uuid;
  
  -- Create the user profile
  INSERT INTO public.profiles (id, account_id, email, full_name, role)
  VALUES (
    NEW.id,
    account_uuid,
    NEW.email,
    user_metadata->>'full_name',
    'admin' -- First user in account is admin
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_and_account();