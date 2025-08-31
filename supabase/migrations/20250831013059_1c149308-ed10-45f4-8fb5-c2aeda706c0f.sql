-- Add comprehensive RLS policies for all tables missing access controls
-- Using correct column names based on actual schema

-- 1. DATA_CONNECTIONS - Contains database credentials (highest priority)
-- Uses account_id
CREATE POLICY "Users can view data connections in their org" 
ON public.data_connections 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage data connections in their org" 
ON public.data_connections 
FOR ALL
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 2. ACCOUNT_SETTINGS - Contains SSO and security configs
-- Uses account_id
CREATE POLICY "Users can view their org account settings" 
ON public.account_settings 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Masters can manage account settings" 
ON public.account_settings 
FOR ALL
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- 3. EMBEDDED_ANALYTICS - Contains security configurations
-- Uses account_id
CREATE POLICY "Users can view embedded analytics in their org" 
ON public.embedded_analytics 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage embedded analytics in their org" 
ON public.embedded_analytics 
FOR ALL
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
FOR ALL
USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d 
    JOIN public.profiles p ON d.org_id = p.org_id 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- 5. SAVED_CHARTS - User chart data
-- Uses account_id
CREATE POLICY "Users can view saved charts in their org" 
ON public.saved_charts 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage their own charts" 
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
-- Uses account_id
CREATE POLICY "Users can view data transformations in their org" 
ON public.data_transformations 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Editors can manage data transformations" 
ON public.data_transformations 
FOR ALL
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- 7. INSTALLED_MARKETPLACE_ITEMS - Installation data
-- Uses account_id
CREATE POLICY "Users can view installed marketplace items in their org" 
ON public.installed_marketplace_items 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage marketplace items in their org" 
ON public.installed_marketplace_items 
FOR ALL
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- 8. AI_GENERATED_DASHBOARDS - AI dashboard data
-- Uses account_id
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
-- Uses account_id
CREATE POLICY "Users can view members in their org" 
ON public.account_members 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Masters can manage org members" 
ON public.account_members 
FOR ALL
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- 10. CHART_ANNOTATIONS - Chart annotation data
-- Uses dashboard_id, so we join through dashboards
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
FOR ALL
USING (user_id = auth.uid());

-- 11. DASHBOARD_COMMENTS - Dashboard comment data
-- Uses account_id
CREATE POLICY "Users can view comments in their org dashboards" 
ON public.dashboard_comments 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage their own comments" 
ON public.dashboard_comments 
FOR ALL
USING (user_id = auth.uid());

-- 12. USAGE_TRACKING - Usage analytics (admin only)
-- Uses org_id (was updated!)
CREATE POLICY "Masters can view usage tracking for their org" 
ON public.usage_tracking 
FOR SELECT 
USING (org_id IN (
  SELECT org_id FROM public.profiles 
  WHERE id = auth.uid() AND role = 'MASTER'
));

CREATE POLICY "System can insert usage tracking" 
ON public.usage_tracking 
FOR INSERT
WITH CHECK (true); -- Allow system inserts

-- Update existing audit_logs policy to use org_id correctly
-- Uses org_id (was updated!)
DROP POLICY IF EXISTS "Super admins can view all audit_logs" ON public.audit_logs;

CREATE POLICY "Super admins can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (is_super_admin(auth.uid()) = true);

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