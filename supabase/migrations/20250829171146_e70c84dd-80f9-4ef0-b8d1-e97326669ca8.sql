-- Security Fix: Add proper RLS policies for the instance table
-- This table contains sensitive WhatsApp integration data that needs proper access control

-- First, let's add a user_id column to associate instances with users
-- This is critical for implementing proper access control
ALTER TABLE public.instance ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add account_id for multi-tenant support (optional but recommended)
ALTER TABLE public.instance ADD COLUMN IF NOT EXISTS account_id UUID;

-- Create index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_instance_user_id ON public.instance(user_id);
CREATE INDEX IF NOT EXISTS idx_instance_account_id ON public.instance(account_id);

-- Now create secure RLS policies

-- Policy 1: Users can only view their own instances
CREATE POLICY "Users can view their own instances" 
ON public.instance 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can only insert instances for themselves
CREATE POLICY "Users can create their own instances" 
ON public.instance 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can only update their own instances
CREATE POLICY "Users can update their own instances" 
ON public.instance 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Policy 4: Users can only delete their own instances
CREATE POLICY "Users can delete their own instances" 
ON public.instance 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Policy 5: Service role access for system operations (if needed)
-- This allows backend operations while maintaining user data isolation
CREATE POLICY "Service role can manage all instances" 
ON public.instance 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Update existing records with a default user_id (you may need to adjust this based on your system)
-- For now, we'll leave them as NULL, but you should assign proper user_ids to existing records
-- UPDATE public.instance SET user_id = 'some-default-user-id' WHERE user_id IS NULL;