-- Fix the account creation issue by ensuring user can create profile first and then account
-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can create their first account" ON public.accounts;
DROP POLICY IF EXISTS "Users without account can create account" ON public.accounts;

-- Allow any authenticated user to create an account (simplified approach)
CREATE POLICY "Authenticated users can create accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the profile creation triggers work properly
-- Update the handle_new_user function to create account when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  account_uuid uuid;
BEGIN
  -- Check if user already has an account through account_id
  IF NEW.account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create a new account for the user
  INSERT INTO public.accounts (name, slug)
  VALUES (
    COALESCE(NEW.full_name, 'Account'), 
    LOWER(REPLACE(COALESCE(NEW.full_name, 'account-' || substring(NEW.id::text from 1 for 8)), ' ', '-'))
  )
  RETURNING id INTO account_uuid;
  
  -- Update the profile with the account_id
  NEW.account_id = account_uuid;
  
  RETURN NEW;
END;
$$;