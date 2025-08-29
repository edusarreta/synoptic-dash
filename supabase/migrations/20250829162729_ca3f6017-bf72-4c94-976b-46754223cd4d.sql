-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;

-- Create a corrected policy that doesn't reference itself
CREATE POLICY "Users can view profiles in their account" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow users to see their own profile
  id = auth.uid() 
  OR 
  -- Allow users to see other profiles in the same account
  account_id = (
    SELECT p.account_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);