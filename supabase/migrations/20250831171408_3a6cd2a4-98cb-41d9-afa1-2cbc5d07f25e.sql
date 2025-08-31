-- Fixed SQL function parameter syntax
CREATE OR REPLACE FUNCTION app.has_permission(
  _user_id UUID, 
  _org_id UUID, 
  _workspace_id UUID, 
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

-- Create overloaded version with default NULL workspace
CREATE OR REPLACE FUNCTION app.has_permission(
  _user_id UUID, 
  _org_id UUID, 
  _perm_code TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT app.has_permission(_user_id, _org_id, NULL, _perm_code);
$$;