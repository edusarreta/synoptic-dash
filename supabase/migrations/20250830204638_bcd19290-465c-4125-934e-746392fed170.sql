-- Fix Database Credentials and Connection Security
-- Restrict data_connections access to admin users only
DROP POLICY IF EXISTS "Users can manage data connections in their account" ON public.data_connections;
DROP POLICY IF EXISTS "Users with edit permissions can manage data connections" ON public.data_connections;

CREATE POLICY "Admins can manage data connections in their account" 
ON public.data_connections 
FOR ALL 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix Communication Integrations Token Security  
DROP POLICY IF EXISTS "Admins can manage communication integrations" ON public.communication_integrations;

CREATE POLICY "Super admins can manage communication integrations" 
ON public.communication_integrations 
FOR ALL 
USING (is_super_admin(auth.uid()) = true);

CREATE POLICY "Creators can view their own communication integrations" 
ON public.communication_integrations 
FOR SELECT 
USING (created_by = auth.uid());

-- Fix Subscription Data Security
DROP POLICY IF EXISTS "Admins can view account subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update account subscription" ON public.subscriptions;

CREATE POLICY "Super admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (is_super_admin(auth.uid()) = true);

CREATE POLICY "Account owners can view their subscription" 
ON public.subscriptions 
FOR SELECT 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix WhatsApp Business Token Security
DROP POLICY IF EXISTS "Users can create their own instances" ON public.instance;
DROP POLICY IF EXISTS "Users can update their own instances" ON public.instance;
DROP POLICY IF EXISTS "Users can view their own instances" ON public.instance;
DROP POLICY IF EXISTS "Users can delete their own instances" ON public.instance;

CREATE POLICY "Admins can manage instances in their account" 
ON public.instance 
FOR ALL 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own instances" 
ON public.instance 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own clients" ON public.client;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.client;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.client;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.client;

CREATE POLICY "Admins can manage clients in their account" 
ON public.client 
FOR ALL 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own clients" 
ON public.client 
FOR SELECT 
USING (user_id = auth.uid());