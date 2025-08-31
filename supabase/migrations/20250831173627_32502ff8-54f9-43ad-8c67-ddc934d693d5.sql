-- Temporarily disable the trigger that's causing issues
DROP TRIGGER IF EXISTS trigger_handle_new_account ON public.accounts;

-- Make org_id nullable temporarily to fix existing data
ALTER TABLE public.subscriptions ALTER COLUMN org_id DROP NOT NULL;

-- Fix subscriptions table structure
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id);

-- Update existing subscriptions to link to accounts via org_id
UPDATE public.subscriptions 
SET account_id = org_id 
WHERE account_id IS NULL AND org_id IS NOT NULL;

-- Now fix MASTER permissions - Create accounts entry and permissions
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
            VALUES (master_org_id, 'Fabrica Automacao', 'fabrica-automacao', 'active');
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

-- Recreate the trigger with the correct column reference
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Create default subscription with 14-day trial using account_id instead of org_id
  INSERT INTO public.subscriptions (account_id, status, plan_type)
  VALUES (NEW.id, 'trialing', 'basic');
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER trigger_handle_new_account
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_account();