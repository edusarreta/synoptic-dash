-- FIXED: Schema reconciliation with correct column mapping
-- Create app schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Create canonical account members view using correct column mapping
CREATE OR REPLACE VIEW app.account_members_v AS
SELECT 
  org_id,
  id as user_id,  -- profiles.id is the user_id
  role,
  created_at
FROM public.profiles;

-- Create canonical organization view
CREATE OR REPLACE VIEW app.organizations_v AS
SELECT 
  id,
  name,
  created_at,
  COALESCE(status, 'active') as status,
  COALESCE(plan_type, 'FREE') as plan_type
FROM public.organizations;

-- Create workspaces table if not exists (minimal implementation)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workspaces in their org" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can manage workspaces in their org" ON public.workspaces;

-- Create workspace policies
CREATE POLICY "Users can view workspaces in their org" ON public.workspaces
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage workspaces in their org" ON public.workspaces
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(ARRAY['MASTER', 'ADMIN'])
  )
);

-- Create canonical workspaces view
CREATE OR REPLACE VIEW app.workspaces_v AS
SELECT 
  id,
  org_id,
  name,
  created_at
FROM public.workspaces;

-- RBAC Functions (corrected)
CREATE OR REPLACE FUNCTION app.role_in_org(_org_id UUID, _user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'VIEWER')
  FROM app.account_members_v 
  WHERE org_id = _org_id AND user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.is_member_of(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM app.account_members_v 
    WHERE org_id = _org_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION app.has_permission(
  _user_id UUID, 
  _org_id UUID, 
  _workspace_id UUID DEFAULT NULL, 
  _perm_code TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    -- 1. MASTER bypass
    WHEN app.role_in_org(_org_id, _user_id) = 'MASTER' THEN true
    
    -- 2. Check explicit DENY grants
    WHEN EXISTS(
      SELECT 1 FROM public.user_grants 
      WHERE org_id = _org_id 
        AND user_id = _user_id 
        AND perm_code = _perm_code 
        AND effect = 'DENY'
        AND (workspace_id = _workspace_id OR workspace_id IS NULL)
    ) THEN false
    
    -- 3. Check role permissions
    WHEN EXISTS(
      SELECT 1 FROM public.role_permissions 
      WHERE org_id = _org_id 
        AND role = app.role_in_org(_org_id, _user_id)
        AND perm_code = _perm_code
    ) THEN true
    
    -- 4. Check explicit ALLOW grants
    WHEN EXISTS(
      SELECT 1 FROM public.user_grants 
      WHERE org_id = _org_id 
        AND user_id = _user_id 
        AND perm_code = _perm_code 
        AND effect = 'ALLOW'
        AND (workspace_id = _workspace_id OR workspace_id IS NULL)
    ) THEN true
    
    -- 5. Default deny
    ELSE false
  END;
$$;

-- Ensure permissions table has module and description columns
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS description TEXT;