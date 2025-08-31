-- Seed permissions with modules and role permissions
-- Add module and description columns if they don't exist
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS description TEXT;

-- Upsert permissions with modules
WITH perms(code, module, description) AS (
  VALUES
    -- connections
    ('connections:create', 'connections', 'Criar conexões de dados'),
    ('connections:read', 'connections', 'Visualizar conexões de dados'),
    ('connections:update', 'connections', 'Editar conexões de dados'),
    ('connections:delete', 'connections', 'Excluir conexões de dados'),
    ('connections:test', 'connections', 'Testar conexões de dados'),
    ('connections:use', 'connections', 'Usar conexões para consultas'),
    
    -- catalog
    ('catalog:read', 'catalog', 'Explorar esquemas e tabelas'),
    
    -- sql
    ('sql:run', 'sql', 'Executar consultas SQL'),
    ('sql:save', 'sql', 'Salvar consultas SQL'),
    
    -- saved queries
    ('saved_queries:read', 'saved_queries', 'Ver consultas salvas'),
    ('saved_queries:create', 'saved_queries', 'Criar consulta salva'),
    ('saved_queries:update', 'saved_queries', 'Editar consulta salva'),
    ('saved_queries:delete', 'saved_queries', 'Excluir consulta salva'),
    
    -- datasets
    ('datasets:read', 'datasets', 'Ver datasets'),
    ('datasets:create', 'datasets', 'Criar dataset'),
    ('datasets:update', 'datasets', 'Editar dataset'),
    ('datasets:delete', 'datasets', 'Excluir dataset'),
    
    -- charts
    ('charts:read', 'charts', 'Ver gráficos'),
    ('charts:create', 'charts', 'Criar gráfico'),
    ('charts:update', 'charts', 'Editar gráfico'),
    ('charts:delete', 'charts', 'Excluir gráfico'),
    
    -- dashboards
    ('dashboards:read', 'dashboards', 'Ver dashboards'),
    ('dashboards:create', 'dashboards', 'Criar dashboard'),
    ('dashboards:update_layout', 'dashboards', 'Editar layout do dashboard'),
    ('dashboards:publish', 'dashboards', 'Publicar dashboard'),
    ('dashboards:share', 'dashboards', 'Compartilhar dashboard'),
    ('dashboards:delete', 'dashboards', 'Excluir dashboard'),
    
    -- embed
    ('embed:use', 'embed', 'Usar funcionalidades de embed'),
    
    -- rbac
    ('rbac:read', 'rbac', 'Ver permissões e papéis'),
    ('rbac:manage', 'rbac', 'Gerenciar permissões e papéis'),
    
    -- billing
    ('billing:read', 'billing', 'Ver informações de cobrança'),
    ('billing:manage', 'billing', 'Gerenciar cobrança'),
    
    -- audit
    ('audit:read', 'audit', 'Ver logs de auditoria')
)
INSERT INTO public.permissions (code, module, description)
SELECT code, module, description FROM perms
ON CONFLICT (code) DO UPDATE SET
  module = EXCLUDED.module,
  description = EXCLUDED.description;

-- Get a sample org_id to seed role permissions
DO $$
DECLARE
  sample_org_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO sample_org_id FROM public.organizations LIMIT 1;
  
  IF sample_org_id IS NOT NULL THEN
    -- Insert role permissions for MASTER
    INSERT INTO public.role_permissions (org_id, role, perm_code)
    SELECT sample_org_id, 'MASTER', code FROM public.permissions
    ON CONFLICT (org_id, role, perm_code) DO NOTHING;
    
    -- Insert role permissions for ADMIN
    INSERT INTO public.role_permissions (org_id, role, perm_code)
    SELECT sample_org_id, 'ADMIN', code FROM public.permissions
    WHERE code NOT LIKE 'rbac:manage'
    ON CONFLICT (org_id, role, perm_code) DO NOTHING;
    
    -- Insert role permissions for EDITOR
    INSERT INTO public.role_permissions (org_id, role, perm_code)
    SELECT sample_org_id, 'EDITOR', unnest(ARRAY[
      'connections:read', 'connections:use', 'catalog:read', 'sql:run', 'sql:save',
      'saved_queries:read', 'saved_queries:create', 'saved_queries:update', 'saved_queries:delete',
      'datasets:read', 'datasets:create', 'datasets:update', 'datasets:delete',
      'charts:read', 'charts:create', 'charts:update', 'charts:delete',
      'dashboards:read', 'dashboards:create', 'dashboards:update_layout', 'dashboards:publish', 'dashboards:share',
      'embed:use', 'rbac:read'
    ])
    ON CONFLICT (org_id, role, perm_code) DO NOTHING;
    
    -- Insert role permissions for VIEWER
    INSERT INTO public.role_permissions (org_id, role, perm_code)
    SELECT sample_org_id, 'VIEWER', unnest(ARRAY[
      'dashboards:read', 'charts:read', 'datasets:read', 'saved_queries:read', 'embed:use'
    ])
    ON CONFLICT (org_id, role, perm_code) DO NOTHING;
  END IF;
END $$;