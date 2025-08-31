-- Add missing RLS policies for all tables that had security warnings

-- Policies for datasets
CREATE POLICY "Users can view datasets in their org" ON public.datasets
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage datasets in their org" ON public.datasets
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- Policies for saved_queries
CREATE POLICY "Users can view queries in their org" ON public.saved_queries
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage queries in their org" ON public.saved_queries
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- Policies for chart_specs
CREATE POLICY "Users can view chart specs in their org" ON public.chart_specs
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage chart specs in their org" ON public.chart_specs
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- Policies for dashboard_layouts
CREATE POLICY "Users can view layouts for accessible dashboards" ON public.dashboard_layouts
FOR SELECT USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Editors can manage layouts for their org dashboards" ON public.dashboard_layouts
FOR ALL USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- Add missing policies for other existing tables that need org-based access

-- Policies for marketplace_items (basic read access)
CREATE POLICY "Users can view active marketplace items" ON public.marketplace_items
FOR SELECT USING (is_active = true);

-- Policies for subscriptions (updated for org structure)
DROP POLICY IF EXISTS "Account owners can view their subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Update subscriptions table if it has account_id instead of org_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'account_id') THEN
        ALTER TABLE public.subscriptions RENAME COLUMN account_id TO org_id;
    END IF;
END $$;

CREATE POLICY "Org owners can view their subscription" ON public.subscriptions
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- Policies for audit_logs (updated for org structure)
DROP POLICY IF EXISTS "Admins can view audit logs for their account" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit_logs" ON public.audit_logs;

-- Update audit_logs table if it has account_id instead of org_id  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'account_id') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN account_id TO org_id;
    END IF;
END $$;

CREATE POLICY "Admins can view audit logs for their org" ON public.audit_logs
FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- Policies for usage_tracking (updated for org structure)
DROP POLICY IF EXISTS "Users can view their account usage" ON public.usage_tracking;

-- Update usage_tracking table if it has account_id instead of org_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_tracking' AND column_name = 'account_id') THEN
        ALTER TABLE public.usage_tracking RENAME COLUMN account_id TO org_id;
    END IF;
END $$;

CREATE POLICY "Users can view their org usage" ON public.usage_tracking
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Add Masters can update their organization policy
CREATE POLICY "Masters can update their organization" ON public.organizations
FOR UPDATE USING (
  id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- Add Insert policy for organizations (if needed for new org creation)
CREATE POLICY "Service can insert organizations" ON public.organizations
FOR INSERT WITH CHECK (true);