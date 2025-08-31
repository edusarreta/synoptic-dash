-- DIAGNOSTICS & SCHEMA DISCOVERY
-- Create app schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Create diagnostic view to analyze current schema structure
CREATE OR REPLACE VIEW app._mapping_info AS
WITH org_candidates AS (
  SELECT 
    table_name,
    column_name,
    data_type,
    'organization' as entity_type,
    CASE 
      WHEN column_name = 'id' THEN 'id'
      WHEN column_name ILIKE ANY(ARRAY['%org_id%', '%organization_id%', '%account_id%']) THEN 'org_ref'
      WHEN column_name ILIKE ANY(ARRAY['name', 'title', 'organization_name']) THEN 'name'
      WHEN column_name = 'created_at' THEN 'created_at'
      WHEN column_name ILIKE '%slug%' THEN 'slug'
      WHEN column_name ILIKE '%status%' THEN 'status'
      ELSE 'other'
    END as field_role
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name ILIKE ANY(ARRAY['%org%', '%account%', '%tenant%', '%organization%'])
),
member_candidates AS (
  SELECT 
    table_name,
    column_name,
    data_type,
    'membership' as entity_type,
    CASE 
      WHEN column_name = 'id' THEN 'id'
      WHEN column_name = 'user_id' THEN 'user_id'
      WHEN column_name ILIKE ANY(ARRAY['%org_id%', '%organization_id%', '%account_id%']) THEN 'org_id'
      WHEN column_name ILIKE ANY(ARRAY['role', 'member_role', 'user_role']) THEN 'role'
      WHEN column_name = 'created_at' THEN 'created_at'
      ELSE 'other'
    END as field_role
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name ILIKE ANY(ARRAY['%member%', '%membership%', '%org_user%', '%account_member%'])
)
SELECT * FROM org_candidates
UNION ALL
SELECT * FROM member_candidates
ORDER BY entity_type, table_name, field_role;

-- Create canonical organization view
CREATE OR REPLACE VIEW app.organizations_v AS
SELECT 
  id,
  name,
  created_at,
  COALESCE(status, 'active') as status,
  COALESCE(plan_type, 'FREE') as plan_type
FROM public.organizations;

-- Create canonical account members view
CREATE OR REPLACE VIEW app.account_members_v AS
SELECT 
  org_id,
  user_id,
  role,
  created_at
FROM public.profiles;

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

-- RBAC Functions
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