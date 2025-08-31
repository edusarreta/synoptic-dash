-- Verificar e corrigir as políticas RLS para data_connections
-- O problema é que as políticas estão usando org_id mas a tabela usa account_id

-- Dropar as políticas existentes que usam org_id incorretamente
DROP POLICY IF EXISTS "Users can view data connections in their org" ON public.data_connections;
DROP POLICY IF EXISTS "Admins can manage data connections in their org" ON public.data_connections;

-- Criar políticas corretas usando account_id
CREATE POLICY "Users can view data connections in their account" 
ON public.data_connections 
FOR SELECT 
USING (account_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
));

CREATE POLICY "Admins can manage data connections in their account" 
ON public.data_connections 
FOR ALL 
USING (account_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['MASTER'::text, 'ADMIN'::text])
));

-- Verificar se a edge function run-sql-query existe, se não, vamos criá-la
-- Verificar também as outras edge functions necessárias