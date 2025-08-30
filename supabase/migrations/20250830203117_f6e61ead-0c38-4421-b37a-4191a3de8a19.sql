-- Fix security vulnerability: Restrict profile access to prevent data theft
-- Remove overly permissive policies that allow viewing other users' profiles

-- Drop the problematic policies that allow viewing other users in same account
DROP POLICY IF EXISTS "Users can view profiles in same account" ON public.profiles;
DROP POLICY IF EXISTS "Users can view same account profiles" ON public.profiles;

-- Create a more secure policy for admin users to view profiles in their account
-- This allows legitimate business operations while protecting user privacy
CREATE POLICY "Admins can view profiles in their account" 
ON public.profiles 
FOR SELECT 
USING (
  account_id = get_user_account_id(auth.uid()) 
  AND (
    -- User can see their own profile
    id = auth.uid() 
    OR 
    -- OR admin users can see other profiles in their account
    (SELECT role FROM public.profiles WHERE id = auth.uid() AND account_id = get_user_account_id(auth.uid())) = 'admin'
  )
);

-- Ensure users can still view their own profile (this policy should already exist)
-- This is a safety net in case the existing policy gets modified
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());