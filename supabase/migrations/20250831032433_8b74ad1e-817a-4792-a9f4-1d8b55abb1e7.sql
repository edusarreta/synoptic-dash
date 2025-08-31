-- Create permissions table first if it doesn't exist
CREATE TABLE IF NOT EXISTS public.permissions (
  code text NOT NULL PRIMARY KEY,
  description text,
  module text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Upsert all required permissions
INSERT INTO public.permissions (code, description, module) VALUES 
  ('connections:create', 'Create new data connections', 'connections'),
  ('connections:read', 'View data connections', 'connections'),
  ('connections:update', 'Update data connections', 'connections'),
  ('connections:delete', 'Delete data connections', 'connections'),
  ('connections:test', 'Test connection credentials', 'connections'),
  ('connections:use', 'Use connections in queries', 'connections'),
  ('connections:secrets:manage', 'Manage connection secrets', 'connections'),
  ('catalog:read', 'Browse database catalog (schemas, tables, columns)', 'catalog'),
  ('sql:run', 'Execute SQL queries', 'sql'),
  ('sql:save', 'Save SQL queries', 'sql'),
  ('saved_queries:read', 'View saved queries', 'saved_queries'),
  ('saved_queries:create', 'Create saved queries', 'saved_queries'),
  ('saved_queries:update', 'Update saved queries', 'saved_queries'),
  ('saved_queries:delete', 'Delete saved queries', 'saved_queries'),
  ('datasets:read', 'View datasets', 'datasets'),
  ('datasets:create', 'Create datasets', 'datasets'),
  ('datasets:update', 'Update datasets', 'datasets'),
  ('datasets:delete', 'Delete datasets', 'datasets'),
  ('charts:read', 'View charts', 'charts'),
  ('charts:create', 'Create charts', 'charts'),
  ('charts:update', 'Update charts', 'charts'),
  ('charts:delete', 'Delete charts', 'charts'),
  ('dashboards:read', 'View dashboards', 'dashboards'),
  ('dashboards:create', 'Create new dashboards', 'dashboards'),
  ('dashboards:update_layout', 'Update dashboard layouts', 'dashboards'),
  ('dashboards:publish', 'Publish dashboards', 'dashboards'),
  ('dashboards:share', 'Share dashboards', 'dashboards'),
  ('dashboards:delete', 'Delete dashboards', 'dashboards'),
  ('embed:use', 'Use embedded analytics', 'embed'),
  ('rbac:read', 'View permissions and roles', 'rbac'),
  ('rbac:manage', 'Manage user permissions and roles', 'rbac'),
  ('billing:read', 'View billing information', 'billing'),
  ('billing:manage', 'Manage billing and subscriptions', 'billing'),
  ('audit:read', 'View audit logs', 'audit')
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- Create rest_resources table for REST API connections
CREATE TABLE IF NOT EXISTS public.rest_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  name text NOT NULL,
  path text NOT NULL,
  method text DEFAULT 'GET',
  query_params jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rest_resources
ALTER TABLE public.rest_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rest_resources
CREATE POLICY "Users can view rest resources in their org" 
ON public.rest_resources 
FOR SELECT 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Editors can manage rest resources in their org" 
ON public.rest_resources 
FOR ALL 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY(ARRAY['MASTER'::text, 'ADMIN'::text, 'EDITOR'::text])
));

-- Insert default role permissions for all organizations
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  org_id,
  'MASTER' as role,
  code as perm_code
FROM organizations, permissions
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = organizations.id 
    AND rp.role = 'MASTER' 
    AND rp.perm_code = permissions.code
);

-- ADMIN permissions (all except super admin functions)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  org_id,
  'ADMIN' as role,
  code as perm_code
FROM organizations, permissions
WHERE code NOT LIKE 'super:%'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.org_id = organizations.id 
      AND rp.role = 'ADMIN' 
      AND rp.perm_code = permissions.code
  );

-- EDITOR permissions (operational permissions, no admin functions)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  org_id,
  'EDITOR' as role,
  code as perm_code
FROM organizations, permissions
WHERE code IN (
  'connections:use', 'catalog:read', 'sql:run', 'sql:save',
  'saved_queries:read', 'saved_queries:create', 'saved_queries:update', 'saved_queries:delete',
  'datasets:read', 'datasets:create', 'datasets:update', 'datasets:delete',
  'charts:read', 'charts:create', 'charts:update', 'charts:delete',
  'dashboards:read', 'dashboards:create', 'dashboards:update_layout', 'dashboards:publish', 'dashboards:share',
  'embed:use'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = organizations.id 
    AND rp.role = 'EDITOR' 
    AND rp.perm_code = permissions.code
);

-- VIEWER permissions (read-only)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  org_id,
  'VIEWER' as role,
  code as perm_code
FROM organizations, permissions
WHERE code IN (
  'connections:read', 'catalog:read', 'saved_queries:read', 'datasets:read', 
  'charts:read', 'dashboards:read', 'rbac:read'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = organizations.id 
    AND rp.role = 'VIEWER' 
    AND rp.perm_code = permissions.code
);