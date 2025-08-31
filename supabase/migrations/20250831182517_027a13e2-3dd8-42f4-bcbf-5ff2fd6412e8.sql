-- Adicionar política específica para DELETE nas conexões
-- Apenas usuários MASTER e ADMIN podem deletar conexões

CREATE POLICY "Admins can delete data connections in their account" 
ON public.data_connections 
FOR DELETE 
USING (
  account_id = public.get_current_user_org_id() 
  AND (
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
  ) = ANY (ARRAY['MASTER'::text, 'ADMIN'::text])
);

-- Adicionar política específica para UPDATE nas conexões
CREATE POLICY "Admins can update data connections in their account" 
ON public.data_connections 
FOR UPDATE 
USING (
  account_id = public.get_current_user_org_id() 
  AND (
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
  ) = ANY (ARRAY['MASTER'::text, 'ADMIN'::text])
);

-- Adicionar política específica para INSERT nas conexões
CREATE POLICY "Admins can insert data connections in their account" 
ON public.data_connections 
FOR INSERT 
WITH CHECK (
  account_id = public.get_current_user_org_id() 
  AND (
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
  ) = ANY (ARRAY['MASTER'::text, 'ADMIN'::text])
);