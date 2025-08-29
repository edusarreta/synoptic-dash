-- Check current RLS policies for data_connections
-- Drop the overly restrictive policy that only allows admin users
DROP POLICY IF EXISTS "Admins can manage data connections in their account" ON public.data_connections;

-- Create a new policy that allows users with edit permissions to manage data connections
CREATE POLICY "Users with edit permissions can manage data connections" 
ON public.data_connections 
FOR ALL 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR 
  is_super_admin(auth.uid()) = true
)
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  OR 
  is_super_admin(auth.uid()) = true
);