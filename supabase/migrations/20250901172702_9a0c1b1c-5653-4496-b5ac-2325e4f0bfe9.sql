-- Seed default permissions for the ConnectaDados application
INSERT INTO public.permissions (code, module, description) VALUES
-- Connection management
('connections:create', 'connections', 'Criar novas conexões de dados'),
('connections:read', 'connections', 'Visualizar conexões de dados'),
('connections:update', 'connections', 'Editar conexões de dados'),
('connections:delete', 'connections', 'Excluir conexões de dados'),

-- Catalog access
('catalog:read', 'catalog', 'Visualizar catálogo de dados (schemas, tabelas, colunas)'),

-- SQL editor and queries
('sql:run', 'sql', 'Executar consultas SQL'),
('sql:save', 'sql', 'Salvar consultas SQL'),

-- Saved queries management
('saved_queries:create', 'saved_queries', 'Criar consultas salvas'),
('saved_queries:read', 'saved_queries', 'Visualizar consultas salvas'),
('saved_queries:update', 'saved_queries', 'Editar consultas salvas'),
('saved_queries:delete', 'saved_queries', 'Excluir consultas salvas'),

-- Dataset management
('datasets:create', 'datasets', 'Criar datasets'),
('datasets:read', 'datasets', 'Visualizar datasets'),
('datasets:update', 'datasets', 'Editar datasets'),
('datasets:delete', 'datasets', 'Excluir datasets'),

-- Chart management
('charts:create', 'charts', 'Criar gráficos e visualizações'),
('charts:read', 'charts', 'Visualizar gráficos'),
('charts:update', 'charts', 'Editar gráficos'),
('charts:delete', 'charts', 'Excluir gráficos'),

-- Dashboard management
('dashboards:create', 'dashboards', 'Criar dashboards'),
('dashboards:read', 'dashboards', 'Visualizar dashboards'),
('dashboards:update', 'dashboards', 'Editar dashboards'),
('dashboards:delete', 'dashboards', 'Excluir dashboards'),
('dashboards:publish', 'dashboards', 'Publicar dashboards'),
('dashboards:share', 'dashboards', 'Compartilhar dashboards'),

-- Embedding and public access
('embed:create', 'embed', 'Criar embeds públicos'),
('embed:manage', 'embed', 'Gerenciar embeds e links públicos'),

-- RBAC and user management
('rbac:read', 'rbac', 'Visualizar permissões e papéis'),
('rbac:manage', 'rbac', 'Gerenciar permissões e papéis de usuários'),

-- Billing and subscriptions
('billing:read', 'billing', 'Visualizar informações de cobrança'),
('billing:manage', 'billing', 'Gerenciar planos e cobrança'),

-- Audit and monitoring
('audit:read', 'audit', 'Visualizar logs de auditoria'),
('audit:export', 'audit', 'Exportar logs de auditoria')

ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module;