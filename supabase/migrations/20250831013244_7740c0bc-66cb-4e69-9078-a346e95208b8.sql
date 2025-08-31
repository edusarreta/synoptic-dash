-- First drop any existing conflicting policies, then add all comprehensive RLS policies

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view data connections in their org" ON public.data_connections;
DROP POLICY IF EXISTS "Admins can manage data connections in their org" ON public.data_connections;

-- 1. DATA_CONNECTIONS - Contains database credentials (highest priority)
CREATE POLICY "Users can view data connections in their org" 
ON public.data_connections 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage data connections in their org" 
ON public.data_connections 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 2. ACCOUNT_SETTINGS - Contains SSO and security configs
CREATE POLICY "Users can view their org account settings" 
ON public.account_settings 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Masters can manage account settings" 
ON public.account_settings 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- 3. EMBEDDED_ANALYTICS - Contains security configurations
CREATE POLICY "Users can view embedded analytics in their org" 
ON public.embedded_analytics 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage embedded analytics in their org" 
ON public.embedded_analytics 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 4. SHARED_DASHBOARD_LINKS - Contains public tokens
CREATE POLICY "Users can view shared dashboard links in their org" 
ON public.shared_dashboard_links 
FOR SELECT 
USING (dashboard_id IN (
  SELECT d.id FROM public.dashboards d 
  JOIN public.profiles p ON d.org_id = p.org_id 
  WHERE p.id = auth.uid()
));

CREATE POLICY "Editors can manage shared dashboard links" 
ON public.shared_dashboard_links 
FOR INSERT, UPDATE, DELETE
USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d 
    JOIN public.profiles p ON d.org_id = p.org_id 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- 5. SAVED_CHARTS - User chart data
CREATE POLICY "Users can view saved charts in their org" 
ON public.saved_charts 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create their own charts" 
ON public.saved_charts 
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND 
  account_id IN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their own charts" 
ON public.saved_charts 
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Admins can delete charts in their org" 
ON public.saved_charts 
FOR DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 6. DATA_TRANSFORMATIONS - Contains transformation data
CREATE POLICY "Users can view data transformations in their org" 
ON public.data_transformations 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Editors can manage data transformations" 
ON public.data_transformations 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- 7. INSTALLED_MARKETPLACE_ITEMS - Installation data
CREATE POLICY "Users can view installed marketplace items in their org" 
ON public.installed_marketplace_items 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage marketplace items in their org" 
ON public.installed_marketplace_items 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 8. AI_GENERATED_DASHBOARDS - AI dashboard data
CREATE POLICY "Users can view AI dashboards in their org" 
ON public.ai_generated_dashboards 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create AI dashboards in their org" 
ON public.ai_generated_dashboards 
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND 
  account_id IN (
    SELECT org_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 9. ACCOUNT_MEMBERS - Member management data
CREATE POLICY "Users can view members in their org" 
ON public.account_members 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Masters can manage org members" 
ON public.account_members 
FOR INSERT, UPDATE, DELETE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- 10. CHART_ANNOTATIONS - Chart annotation data
CREATE POLICY "Users can view chart annotations in their org" 
ON public.chart_annotations 
FOR SELECT 
USING (dashboard_id IN (
  SELECT d.id FROM public.dashboards d 
  JOIN public.profiles p ON d.org_id = p.org_id 
  WHERE p.id = auth.uid()
));

CREATE POLICY "Users can manage their own chart annotations" 
ON public.chart_annotations 
FOR INSERT, UPDATE, DELETE
USING (user_id = auth.uid());

-- 11. DASHBOARD_COMMENTS - Dashboard comment data
CREATE POLICY "Users can view comments in their org dashboards" 
ON public.dashboard_comments 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage their own comments" 
ON public.dashboard_comments 
FOR INSERT, UPDATE, DELETE
USING (user_id = auth.uid());

-- 12. USAGE_TRACKING - Usage analytics (admin only)
CREATE POLICY "Masters can view usage tracking for their org" 
ON public.usage_tracking 
FOR SELECT 
USING (org_id IN (
  SELECT org_id FROM public.profiles 
  WHERE id = auth.uid() AND role = 'MASTER'
));

-- Update audit_logs policies
DROP POLICY IF EXISTS "Masters can view audit logs for their org" ON public.audit_logs;

CREATE POLICY "Masters can view audit logs for their org" 
ON public.audit_logs 
FOR SELECT 
USING (
  NOT is_super_admin(auth.uid()) AND 
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);