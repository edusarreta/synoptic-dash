-- Fix the trigger that's causing the error and bootstrap MASTER permissions

-- First drop the problematic trigger
DROP TRIGGER IF EXISTS on_account_created ON public.accounts;
DROP FUNCTION IF EXISTS public.handle_new_account();

-- Create corrected trigger function that uses org_id instead of account_id
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create default subscription with 14-day trial using org_id
  INSERT INTO public.subscriptions (org_id, status, plan_type)
  VALUES (NEW.id, 'trialing', 'basic')
  ON CONFLICT (org_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_account_created
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();

-- Now bootstrap MASTER permissions
DO $$
DECLARE
    master_user_id uuid;
    master_org_id uuid;
    account_exists boolean;
BEGIN
    -- Get the first MASTER user from profiles
    SELECT id, org_id INTO master_user_id, master_org_id 
    FROM public.profiles 
    WHERE role = 'MASTER' 
    LIMIT 1;
    
    IF master_user_id IS NOT NULL AND master_org_id IS NOT NULL THEN
        -- Check if account exists
        SELECT EXISTS(SELECT 1 FROM public.accounts WHERE id = master_org_id) INTO account_exists;
        
        IF NOT account_exists THEN
            -- Create account entry to match the org_id
            INSERT INTO public.accounts (id, name, slug, status)
            VALUES (master_org_id, 'Fabrica Automacao', 'fabrica-automacao', 'active')
            ON CONFLICT (id) DO NOTHING;
        END IF;
        
        -- Create account_members entry
        INSERT INTO public.account_members (account_id, user_id, role, invited_by)
        VALUES (master_org_id, master_user_id, 'admin', master_user_id)
        ON CONFLICT (account_id, user_id) DO NOTHING;
        
        -- Seed all permissions for MASTER role in this organization
        INSERT INTO public.role_permissions (org_id, role, perm_code)
        SELECT master_org_id, 'MASTER', code
        FROM public.permissions
        ON CONFLICT (org_id, role, perm_code) DO NOTHING;
        
        RAISE NOTICE 'Bootstrap completed for MASTER user % with account %', master_user_id, master_org_id;
    ELSE
        RAISE NOTICE 'No MASTER user found or missing org_id';
    END IF;
END $$;