-- Security Fix: Add proper RLS policies for the client table
-- This table also contains sensitive WhatsApp business access tokens

-- Add user_id column to associate clients with users
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add account_id for multi-tenant support
ALTER TABLE public.client ADD COLUMN IF NOT EXISTS account_id UUID;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_user_id ON public.client(user_id);
CREATE INDEX IF NOT EXISTS idx_client_account_id ON public.client(account_id);

-- Create secure RLS policies for client table

-- Policy 1: Users can only view their own clients
CREATE POLICY "Users can view their own clients" 
ON public.client 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can only insert clients for themselves
CREATE POLICY "Users can create their own clients" 
ON public.client 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can only update their own clients
CREATE POLICY "Users can update their own clients" 
ON public.client 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Policy 4: Users can only delete their own clients
CREATE POLICY "Users can delete their own clients" 
ON public.client 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Policy 5: Service role access for system operations
CREATE POLICY "Service role can manage all clients" 
ON public.client 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);