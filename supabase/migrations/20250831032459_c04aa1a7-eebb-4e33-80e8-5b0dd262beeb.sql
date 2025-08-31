-- Fix role permissions insert by using organizations.id as org_id
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  o.id as org_id,
  'MASTER' as role,
  p.code as perm_code
FROM organizations o, permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = o.id 
    AND rp.role = 'MASTER' 
    AND rp.perm_code = p.code
);

-- ADMIN permissions (all except super admin functions)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  o.id as org_id,
  'ADMIN' as role,
  p.code as perm_code
FROM organizations o, permissions p
WHERE p.code NOT LIKE 'super:%'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.org_id = o.id 
      AND rp.role = 'ADMIN' 
      AND rp.perm_code = p.code
  );

-- EDITOR permissions (operational permissions, no admin functions)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  o.id as org_id,
  'EDITOR' as role,
  p.code as perm_code
FROM organizations o, permissions p
WHERE p.code IN (
  'connections:use', 'catalog:read', 'sql:run', 'sql:save',
  'saved_queries:read', 'saved_queries:create', 'saved_queries:update', 'saved_queries:delete',
  'datasets:read', 'datasets:create', 'datasets:update', 'datasets:delete',
  'charts:read', 'charts:create', 'charts:update', 'charts:delete',
  'dashboards:read', 'dashboards:create', 'dashboards:update_layout', 'dashboards:publish', 'dashboards:share',
  'embed:use'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = o.id 
    AND rp.role = 'EDITOR' 
    AND rp.perm_code = p.code
);

-- VIEWER permissions (read-only)
INSERT INTO public.role_permissions (org_id, role, perm_code)
SELECT DISTINCT 
  o.id as org_id,
  'VIEWER' as role,
  p.code as perm_code
FROM organizations o, permissions p
WHERE p.code IN (
  'connections:read', 'catalog:read', 'saved_queries:read', 'datasets:read', 
  'charts:read', 'dashboards:read', 'rbac:read'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.org_id = o.id 
    AND rp.role = 'VIEWER' 
    AND rp.perm_code = p.code
);