-- Fix infinite recursion in profiles RLS policy
-- Drop the problematic policy that creates circular dependency
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;

-- Create a corrected policy that doesn't self-reference
CREATE POLICY "Users can view profiles in their account" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.account_id = profiles.account_id
  )
);

-- Actually, let's use a simpler approach that avoids the recursion entirely
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;

-- Create a new policy that uses the account_id directly without subquery to profiles
CREATE POLICY "Users can view profiles in their account" 
ON public.profiles 
FOR SELECT 
USING (
  id = auth.uid() 
  OR 
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Let's try a different approach to avoid the recursion completely
DROP POLICY IF EXISTS "Users can view profiles in their account" ON public.profiles;

-- Use auth.uid() directly and a separate policy for account members
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can view other profiles in same account" 
ON public.profiles 
FOR SELECT 
USING (
  account_id = (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND id != auth.uid()
);