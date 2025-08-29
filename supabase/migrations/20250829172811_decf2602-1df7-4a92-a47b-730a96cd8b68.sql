-- Sistema de Permissões Super Admin
-- Adicionar coluna is_super_admin na tabela profiles

-- 1. Adicionar coluna is_super_admin na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Adicionar coluna status na tabela accounts para suspenção/reativação
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- 3. Criar função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = user_id),
    false
  );
$$;

-- 4. Criar função para obter role do usuário (incluindo super admin)
CREATE OR REPLACE FUNCTION public.get_user_role_with_super_admin(user_id uuid, account_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = user_id) = true THEN 'super_admin'
    ELSE (SELECT role FROM public.profiles WHERE id = user_id AND profiles.account_id = account_id)
  END;
$$;

-- 5. Atualizar políticas RLS para permitir super admin bypass

-- Política para accounts - Super admins podem ver todas as contas
DROP POLICY IF EXISTS "Super admins can view all accounts" ON public.accounts;
CREATE POLICY "Super admins can view all accounts" 
ON public.accounts 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para accounts - Super admins podem atualizar todas as contas
DROP POLICY IF EXISTS "Super admins can update all accounts" ON public.accounts;
CREATE POLICY "Super admins can update all accounts" 
ON public.accounts 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para profiles - Super admins podem ver todos os perfis
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para subscriptions - Super admins podem ver todas as assinaturas
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para dashboards - Super admins podem ver todos os dashboards
DROP POLICY IF EXISTS "Super admins can view all dashboards" ON public.dashboards;
CREATE POLICY "Super admins can view all dashboards" 
ON public.dashboards 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para data_connections - Super admins podem ver todas as conexões
DROP POLICY IF EXISTS "Super admins can view all data_connections" ON public.data_connections;
CREATE POLICY "Super admins can view all data_connections" 
ON public.data_connections 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- Política para audit_logs - Super admins podem ver todos os logs
DROP POLICY IF EXISTS "Super admins can view all audit_logs" ON public.audit_logs;
CREATE POLICY "Super admins can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (public.is_super_admin(auth.uid()) = true);

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON public.profiles(is_super_admin) WHERE is_super_admin = true;
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);

-- 7. Criar trigger para audit log quando conta for suspensa/reativada
CREATE OR REPLACE FUNCTION public.audit_account_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log quando status da conta muda
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      account_id,
      user_id,
      action,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'suspended' THEN 'account_suspended'
        WHEN NEW.status = 'active' THEN 'account_reactivated'
        ELSE 'account_status_changed'
      END,
      'account',
      NEW.id::text,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_by_super_admin', public.is_super_admin(auth.uid())
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para audit de mudanças de status de conta
DROP TRIGGER IF EXISTS trigger_audit_account_status_change ON public.accounts;
CREATE TRIGGER trigger_audit_account_status_change
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_account_status_change();