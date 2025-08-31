-- Remove the problematic trigger and function with CASCADE
DROP FUNCTION IF EXISTS public.handle_new_account() CASCADE;

-- Fix subscriptions table structure 
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id);

-- Make org_id nullable in subscriptions since we're transitioning to account_id
ALTER TABLE public.subscriptions 
ALTER COLUMN org_id DROP NOT NULL;

-- Update existing subscriptions to link to accounts via org_id
UPDATE public.subscriptions 
SET account_id = org_id 
WHERE account_id IS NULL AND org_id IS NOT NULL;

-- Now bootstrap MASTER permissions
DO $$
DECLARE
    master_user_id uuid;
    master_org_id uuid;
    account_exists boolean;
    perm_count integer;
BEGIN
    -- Get Eduardo's MASTER user from profiles  
    SELECT id, org_id INTO master_user_id, master_org_id 
    FROM public.profiles 
    WHERE email = 'eduardo@fabricaautomacao.com.br' AND role = 'MASTER'
    LIMIT 1;
    
    IF master_user_id IS NOT NULL AND master_org_id IS NOT NULL THEN
        RAISE NOTICE 'Found MASTER user Eduardo % with org %', master_user_id, master_org_id;
        
        -- Check if account exists
        SELECT EXISTS(SELECT 1 FROM public.accounts WHERE id = master_org_id) INTO account_exists;
        RAISE NOTICE 'Account exists: %', account_exists;
        
        IF NOT account_exists THEN
            -- Create account entry to match the org_id
            INSERT INTO public.accounts (id, name, slug, status)
            VALUES (master_org_id, 'Fabrica Automacao', 'fabrica-automacao', 'active');
            RAISE NOTICE 'Created account for org %', master_org_id;
        END IF;
        
        -- Create account_members entry
        INSERT INTO public.account_members (account_id, user_id, role, invited_by)
        VALUES (master_org_id, master_user_id, 'admin', master_user_id)
        ON CONFLICT (account_id, user_id) DO NOTHING;
        RAISE NOTICE 'Created account_members entry';
        
        -- Count permissions and insert them
        SELECT COUNT(*) INTO perm_count FROM public.permissions;
        RAISE NOTICE 'Found % permissions to assign', perm_count;
        
        -- Seed all permissions for MASTER role in this organization
        INSERT INTO public.role_permissions (org_id, role, perm_code)
        SELECT master_org_id, 'MASTER', code
        FROM public.permissions
        ON CONFLICT (org_id, role, perm_code) DO NOTHING;
        
        -- Verify permissions were created
        SELECT COUNT(*) INTO perm_count 
        FROM public.role_permissions 
        WHERE org_id = master_org_id AND role = 'MASTER';
        
        RAISE NOTICE 'Bootstrap completed! Eduardo now has % MASTER permissions', perm_count;
    ELSE
        RAISE NOTICE 'Eduardo MASTER user not found or missing org_id';
    END IF;
END $$;