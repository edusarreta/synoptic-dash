-- Fix MASTER permissions and bootstrap organization data

-- First, ensure we have an organization for the current user
DO $$
DECLARE
    master_user_id uuid;
    master_org_id uuid;
    org_exists boolean;
BEGIN
    -- Get the first MASTER user from profiles
    SELECT id, org_id INTO master_user_id, master_org_id 
    FROM public.profiles 
    WHERE role = 'MASTER' 
    LIMIT 1;
    
    IF master_user_id IS NOT NULL AND master_org_id IS NOT NULL THEN
        -- Check if organization exists
        SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = master_org_id) INTO org_exists;
        
        IF NOT org_exists THEN
            -- Create organization if it doesn't exist
            INSERT INTO public.organizations (id, name, slug, status, plan_type)
            VALUES (master_org_id, 'Master Organization', 'master-org', 'active', 'ENTERPRISE')
            ON CONFLICT (id) DO NOTHING;
        END IF;
        
        -- Ensure account_members entry exists
        INSERT INTO public.account_members (account_id, user_id, role, invited_by)
        VALUES (master_org_id, master_user_id, 'admin', master_user_id)
        ON CONFLICT (account_id, user_id) DO NOTHING;
        
        -- Seed all permissions for MASTER role in this organization
        INSERT INTO public.role_permissions (org_id, role, perm_code)
        SELECT master_org_id, 'MASTER', code
        FROM public.permissions
        ON CONFLICT (org_id, role, perm_code) DO NOTHING;
        
        -- Also add all permissions for ADMIN, EDITOR, VIEWER roles
        INSERT INTO public.role_permissions (org_id, role, perm_code)
        SELECT 
            master_org_id,
            unnest(ARRAY['ADMIN', 'EDITOR', 'VIEWER']),
            code
        FROM public.permissions
        WHERE module IN ('dashboards', 'charts', 'connections', 'datasets')
        ON CONFLICT (org_id, role, perm_code) DO NOTHING;
        
        RAISE NOTICE 'Bootstrap completed for MASTER user % in organization %', master_user_id, master_org_id;
    ELSE
        RAISE NOTICE 'No MASTER user found or missing org_id';
    END IF;
END $$;