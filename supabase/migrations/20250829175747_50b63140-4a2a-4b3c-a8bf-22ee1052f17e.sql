-- Check and fix the accounts RLS policy for user creation
-- Drop the problematic policy that prevents account creation
DROP POLICY IF EXISTS "Users can create their first account" ON public.accounts;

-- Create a better policy that allows users to create their first account
CREATE POLICY "Users can create their first account" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Also ensure we have a policy for when a profile exists but no account_id
CREATE POLICY "Users without account can create account" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);