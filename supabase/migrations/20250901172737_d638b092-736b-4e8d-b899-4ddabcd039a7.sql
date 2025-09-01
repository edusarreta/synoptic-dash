-- Create a function to seed default role permissions for an organization
CREATE OR REPLACE FUNCTION public.seed_default_permissions(org_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing role permissions for this org (clean slate)
  DELETE FROM public.role_permissions WHERE org_id = org_uuid;
  
  -- VIEWER permissions - read-only access
  INSERT INTO public.role_permissions (org_id, role, perm_code) VALUES
  (org_uuid, 'VIEWER', 'connections:read'),
  (org_uuid, 'VIEWER', 'catalog:read'),
  (org_uuid, 'VIEWER', 'saved_queries:read'),
  (org_uuid, 'VIEWER', 'datasets:read'),
  (org_uuid, 'VIEWER', 'charts:read'),
  (org_uuid, 'VIEWER', 'dashboards:read');
  
  -- EDITOR permissions - VIEWER + create/edit content
  INSERT INTO public.role_permissions (org_id, role, perm_code) VALUES
  -- Inherit all VIEWER permissions
  (org_uuid, 'EDITOR', 'connections:read'),
  (org_uuid, 'EDITOR', 'catalog:read'),
  (org_uuid, 'EDITOR', 'saved_queries:read'),
  (org_uuid, 'EDITOR', 'datasets:read'),
  (org_uuid, 'EDITOR', 'charts:read'),
  (org_uuid, 'EDITOR', 'dashboards:read'),
  -- Additional EDITOR permissions
  (org_uuid, 'EDITOR', 'sql:run'),
  (org_uuid, 'EDITOR', 'sql:save'),
  (org_uuid, 'EDITOR', 'saved_queries:create'),
  (org_uuid, 'EDITOR', 'saved_queries:update'),
  (org_uuid, 'EDITOR', 'datasets:create'),
  (org_uuid, 'EDITOR', 'datasets:update'),
  (org_uuid, 'EDITOR', 'charts:create'),
  (org_uuid, 'EDITOR', 'charts:update'),
  (org_uuid, 'EDITOR', 'dashboards:create'),
  (org_uuid, 'EDITOR', 'dashboards:update'),
  (org_uuid, 'EDITOR', 'dashboards:publish'),
  (org_uuid, 'EDITOR', 'dashboards:share');
  
  -- ADMIN permissions - EDITOR + manage connections and advanced features
  INSERT INTO public.role_permissions (org_id, role, perm_code) VALUES
  -- Inherit all EDITOR permissions
  (org_uuid, 'ADMIN', 'connections:read'),
  (org_uuid, 'ADMIN', 'catalog:read'),
  (org_uuid, 'ADMIN', 'saved_queries:read'),
  (org_uuid, 'ADMIN', 'datasets:read'),
  (org_uuid, 'ADMIN', 'charts:read'),
  (org_uuid, 'ADMIN', 'dashboards:read'),
  (org_uuid, 'ADMIN', 'sql:run'),
  (org_uuid, 'ADMIN', 'sql:save'),
  (org_uuid, 'ADMIN', 'saved_queries:create'),
  (org_uuid, 'ADMIN', 'saved_queries:update'),
  (org_uuid, 'ADMIN', 'datasets:create'),
  (org_uuid, 'ADMIN', 'datasets:update'),
  (org_uuid, 'ADMIN', 'charts:create'),
  (org_uuid, 'ADMIN', 'charts:update'),
  (org_uuid, 'ADMIN', 'dashboards:create'),
  (org_uuid, 'ADMIN', 'dashboards:update'),
  (org_uuid, 'ADMIN', 'dashboards:publish'),
  (org_uuid, 'ADMIN', 'dashboards:share'),
  -- Additional ADMIN permissions
  (org_uuid, 'ADMIN', 'connections:create'),
  (org_uuid, 'ADMIN', 'connections:update'),
  (org_uuid, 'ADMIN', 'connections:delete'),
  (org_uuid, 'ADMIN', 'saved_queries:delete'),
  (org_uuid, 'ADMIN', 'datasets:delete'),
  (org_uuid, 'ADMIN', 'charts:delete'),
  (org_uuid, 'ADMIN', 'dashboards:delete'),
  (org_uuid, 'ADMIN', 'embed:create'),
  (org_uuid, 'ADMIN', 'embed:manage'),
  (org_uuid, 'ADMIN', 'rbac:read'),
  (org_uuid, 'ADMIN', 'billing:read'),
  (org_uuid, 'ADMIN', 'audit:read');
  
  -- MASTER permissions - all permissions (MASTER gets all permissions via code, but we can document some here)
  INSERT INTO public.role_permissions (org_id, role, perm_code) VALUES
  -- Connection management
  (org_uuid, 'MASTER', 'connections:create'),
  (org_uuid, 'MASTER', 'connections:read'),
  (org_uuid, 'MASTER', 'connections:update'),
  (org_uuid, 'MASTER', 'connections:delete'),
  -- All other permissions MASTER gets via bypass in code
  (org_uuid, 'MASTER', 'rbac:manage'),
  (org_uuid, 'MASTER', 'billing:manage'),
  (org_uuid, 'MASTER', 'audit:read'),
  (org_uuid, 'MASTER', 'audit:export');
  
END;
$$;

-- Update the account creation trigger to seed permissions for new organizations
CREATE OR REPLACE FUNCTION public.create_user_profile_and_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account_uuid uuid;
  user_metadata jsonb;
BEGIN
  -- Get user metadata
  user_metadata := NEW.raw_user_meta_data;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Create a new account first
  INSERT INTO public.accounts (name, slug)
  VALUES (
    COALESCE(user_metadata->>'account_name', user_metadata->>'full_name', 'Account'), 
    LOWER(REPLACE(COALESCE(user_metadata->>'account_name', user_metadata->>'full_name', 'account-' || substring(NEW.id::text from 1 for 8)), ' ', '-'))
  )
  RETURNING id INTO account_uuid;
  
  -- Create the user profile
  INSERT INTO public.profiles (id, account_id, org_id, email, full_name, role)
  VALUES (
    NEW.id,
    account_uuid,
    account_uuid, -- Set org_id same as account_id for now
    NEW.email,
    user_metadata->>'full_name',
    'MASTER' -- First user in account is MASTER
  );
  
  -- Seed default permissions for the new organization
  PERFORM public.seed_default_permissions(account_uuid);
  
  RETURN NEW;
END;
$function$;