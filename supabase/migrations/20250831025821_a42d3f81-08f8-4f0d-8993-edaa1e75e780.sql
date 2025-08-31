-- 0) PREFLIGHT: Database schema for user settings and granular permissions

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  number_format TEXT DEFAULT 'pt-BR',
  default_org_id UUID REFERENCES public.organizations(id),
  default_workspace_id UUID,
  email_opt_in BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create api_tokens table  
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  code TEXT PRIMARY KEY,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create role_permissions table  
CREATE TABLE IF NOT EXISTS public.role_permissions (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  perm_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (org_id, role, perm_code)
);

-- Create user_grants table
CREATE TABLE IF NOT EXISTS public.user_grants (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perm_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id, perm_code)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
FOR ALL USING (id = auth.uid());

-- RLS Policies for api_tokens
CREATE POLICY "Users can manage their own tokens" ON public.api_tokens
FOR ALL USING (user_id = auth.uid());

-- RLS Policies for permissions
CREATE POLICY "Authenticated users can read permissions" ON public.permissions
FOR SELECT TO authenticated USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Org admins can manage role permissions" ON public.role_permissions
FOR ALL USING (
  org_id IN (
    SELECT p.org_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN')
  )
);

-- RLS Policies for user_grants
CREATE POLICY "Org admins can manage user grants" ON public.user_grants
FOR ALL USING (
  org_id IN (
    SELECT p.org_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Users can view their own grants" ON public.user_grants
FOR SELECT USING (user_id = auth.uid());

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_member_of(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND org_id = org_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.role_in_org(org_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles 
  WHERE id = auth.uid() AND org_id = org_uuid;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _org_id uuid, _workspace_id uuid DEFAULT NULL, _perm_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_role AS (
    SELECT role FROM public.profiles 
    WHERE id = _user_id AND org_id = _org_id
  ),
  role_perms AS (
    SELECT EXISTS (
      SELECT 1 FROM public.role_permissions rp, user_role ur
      WHERE rp.org_id = _org_id 
        AND rp.role = ur.role 
        AND rp.perm_code = _perm_code
    ) as has_role_perm
  ),
  user_grants_result AS (
    SELECT 
      bool_or(effect = 'ALLOW') as has_allow,
      bool_or(effect = 'DENY') as has_deny
    FROM public.user_grants ug
    WHERE ug.org_id = _org_id 
      AND ug.user_id = _user_id 
      AND ug.perm_code = _perm_code
      AND (_workspace_id IS NULL OR ug.workspace_id IS NULL OR ug.workspace_id = _workspace_id)
  )
  SELECT CASE 
    WHEN ugr.has_deny THEN false
    WHEN ugr.has_allow THEN true  
    WHEN rp.has_role_perm THEN true
    ELSE false
  END
  FROM role_perms rp, user_grants_result ugr;
$$;

-- Seed permissions data
INSERT INTO public.permissions (code, description, module) VALUES
-- Connections
('connections:create', 'Create database connections', 'connections'),
('connections:read', 'View database connections', 'connections'),  
('connections:update', 'Update database connections', 'connections'),
('connections:delete', 'Delete database connections', 'connections'),
('connections:test', 'Test database connections', 'connections'),
('connections:use', 'Use database connections for queries', 'connections'),
('secrets:manage', 'Manage connection secrets', 'connections'),

-- Catalog
('catalog:read', 'Browse database catalog', 'catalog'),

-- SQL
('sql:run', 'Execute SQL queries', 'sql'),
('sql:save', 'Save SQL queries', 'sql'),

-- Saved Queries
('saved_queries:read', 'View saved queries', 'saved_queries'),
('saved_queries:create', 'Create saved queries', 'saved_queries'),
('saved_queries:update', 'Update saved queries', 'saved_queries'),
('saved_queries:delete', 'Delete saved queries', 'saved_queries'),

-- Datasets
('datasets:read', 'View datasets', 'datasets'),
('datasets:create', 'Create datasets', 'datasets'),
('datasets:update', 'Update datasets', 'datasets'),
('datasets:delete', 'Delete datasets', 'datasets'),

-- Charts
('charts:read', 'View charts', 'charts'),
('charts:create', 'Create charts', 'charts'),
('charts:update', 'Update charts', 'charts'),
('charts:delete', 'Delete charts', 'charts'),

-- Dashboards
('dashboards:read', 'View dashboards', 'dashboards'),
('dashboards:update_layout', 'Update dashboard layouts', 'dashboards'),
('dashboards:publish', 'Publish dashboards', 'dashboards'),
('dashboards:share', 'Share dashboards', 'dashboards'),
('dashboards:delete', 'Delete dashboards', 'dashboards'),

-- Embed
('embed:use', 'Use embedded analytics', 'embed'),

-- RBAC
('rbac:read', 'View roles and permissions', 'rbac'),
('rbac:manage', 'Manage roles and permissions', 'rbac'),

-- Billing
('billing:read', 'View billing information', 'billing'),
('billing:manage', 'Manage billing and subscriptions', 'billing'),

-- Audit
('audit:read', 'View audit logs', 'audit')
ON CONFLICT (code) DO NOTHING;

-- Update timestamps trigger for user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();