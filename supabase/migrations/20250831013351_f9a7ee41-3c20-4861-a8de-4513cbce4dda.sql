-- Add comprehensive RLS policies for all tables missing access controls
-- Using separate policies for different operations

-- 1. DATA_CONNECTIONS - Contains database credentials (highest priority)
CREATE POLICY "Users can view data connections in their org" 
ON public.data_connections 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can insert data connections in their org" 
ON public.data_connections 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can update data connections in their org" 
ON public.data_connections 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can delete data connections in their org" 
ON public.data_connections 
FOR DELETE
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

CREATE POLICY "Masters can insert account settings" 
ON public.account_settings 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

CREATE POLICY "Masters can update account settings" 
ON public.account_settings 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

CREATE POLICY "Masters can delete account settings" 
ON public.account_settings 
FOR DELETE
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

CREATE POLICY "Admins can insert embedded analytics" 
ON public.embedded_analytics 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can update embedded analytics" 
ON public.embedded_analytics 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can delete embedded analytics" 
ON public.embedded_analytics 
FOR DELETE
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

CREATE POLICY "Editors can insert shared dashboard links" 
ON public.shared_dashboard_links 
FOR INSERT
WITH CHECK (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d 
    JOIN public.profiles p ON d.org_id = p.org_id 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

CREATE POLICY "Editors can update shared dashboard links" 
ON public.shared_dashboard_links 
FOR UPDATE
USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d 
    JOIN public.profiles p ON d.org_id = p.org_id 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

CREATE POLICY "Editors can delete shared dashboard links" 
ON public.shared_dashboard_links 
FOR DELETE
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

CREATE POLICY "Editors can insert data transformations" 
ON public.data_transformations 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

CREATE POLICY "Editors can update data transformations" 
ON public.data_transformations 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

CREATE POLICY "Editors can delete data transformations" 
ON public.data_transformations 
FOR DELETE
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

CREATE POLICY "Admins can install marketplace items" 
ON public.installed_marketplace_items 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can update marketplace items" 
ON public.installed_marketplace_items 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Admins can delete marketplace items" 
ON public.installed_marketplace_items 
FOR DELETE
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

CREATE POLICY "Masters can add org members" 
ON public.account_members 
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

CREATE POLICY "Masters can update org members" 
ON public.account_members 
FOR UPDATE
USING (
  account_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

CREATE POLICY "Masters can remove org members" 
ON public.account_members 
FOR DELETE
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

CREATE POLICY "Users can create their own chart annotations" 
ON public.chart_annotations 
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chart annotations" 
ON public.chart_annotations 
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chart annotations" 
ON public.chart_annotations 
FOR DELETE
USING (user_id = auth.uid());

-- 11. DASHBOARD_COMMENTS - Dashboard comment data
CREATE POLICY "Users can view comments in their org dashboards" 
ON public.dashboard_comments 
FOR SELECT 
USING (account_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create their own comments" 
ON public.dashboard_comments 
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" 
ON public.dashboard_comments 
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
ON public.dashboard_comments 
FOR DELETE
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