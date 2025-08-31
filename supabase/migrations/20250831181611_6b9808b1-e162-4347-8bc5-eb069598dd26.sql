-- Corrigir as políticas RLS para usar account_id corretamente
-- O problema pode ser que a política está fazendo referência circular

-- Primeiro, vamos criar uma função para obter o org_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Dropar e recriar as políticas com a função
DROP POLICY IF EXISTS "Users can view data connections in their account" ON public.data_connections;
DROP POLICY IF EXISTS "Admins can manage data connections in their account" ON public.data_connections;

-- Política para visualizar conexões
CREATE POLICY "Users can view data connections in their account" 
ON public.data_connections 
FOR SELECT 
USING (account_id = public.get_current_user_org_id());

-- Política para gerenciar conexões (apenas ADMIN e MASTER)
CREATE POLICY "Admins can manage data connections in their account" 
ON public.data_connections 
FOR ALL 
USING (
  account_id = public.get_current_user_org_id() 
  AND public.get_user_role_with_super_admin(auth.uid(), public.get_current_user_org_id()) = ANY (ARRAY['MASTER', 'ADMIN'])
);