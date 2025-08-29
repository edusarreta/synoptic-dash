-- Fix account creation for new users
-- Drop the restrictive policy that prevents new users from creating accounts
DROP POLICY IF EXISTS "Admins can insert accounts" ON public.accounts;

-- Create a new policy that allows users to create their first account
CREATE POLICY "Users can create their first account" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and doesn't have any existing profiles
  auth.uid() IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Also allow admins to create accounts (for existing users with admin role)
CREATE POLICY "Admins can create accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);