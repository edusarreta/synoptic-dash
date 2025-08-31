-- Corrigir a função get_current_user_org_id 
-- O problema é que ela está sendo usada nas políticas RLS e causando o erro
-- "column profiles.account_id does not exist"

-- Vamos verificar se a função está funcionando corretamente
-- A função deve referenciar profiles.org_id, não profiles.account_id

-- Vamos recriar a função para garantir que esteja correta
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Vamos também temporariamente simplificar a política de gerenciamento
-- para evitar o erro de coluna inexistente
DROP POLICY IF EXISTS "Admins can manage data connections in their account" ON public.data_connections;

-- Criar uma política mais simples para gerenciamento
CREATE POLICY "Admins can manage data connections in their account" 
ON public.data_connections 
FOR ALL 
USING (
  account_id = public.get_current_user_org_id() 
  AND (
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
  ) = ANY (ARRAY['MASTER'::text, 'ADMIN'::text])
);