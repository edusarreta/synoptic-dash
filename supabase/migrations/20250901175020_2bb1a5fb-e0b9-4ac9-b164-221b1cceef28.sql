-- Inserir permissões padrão no sistema
INSERT INTO permissions (module, code, description) VALUES
-- Conexões
('connections', 'connections:create', 'Criar novas conexões de dados'),
('connections', 'connections:read', 'Visualizar conexões de dados'),
('connections', 'connections:update', 'Editar conexões de dados'),
('connections', 'connections:delete', 'Excluir conexões de dados'),
('connections', 'connections:test', 'Testar conexões de dados'),

-- Catálogo
('catalog', 'catalog:read', 'Visualizar catálogo de dados'),

-- SQL
('sql', 'sql:run', 'Executar consultas SQL'),
('sql', 'sql:save', 'Salvar consultas SQL'),

-- Consultas salvas
('queries', 'saved_queries:create', 'Criar consultas salvas'),
('queries', 'saved_queries:read', 'Visualizar consultas salvas'),
('queries', 'saved_queries:update', 'Editar consultas salvas'),
('queries', 'saved_queries:delete', 'Excluir consultas salvas'),

-- Datasets
('datasets', 'datasets:create', 'Criar datasets'),
('datasets', 'datasets:read', 'Visualizar datasets'),
('datasets', 'datasets:update', 'Editar datasets'),
('datasets', 'datasets:delete', 'Excluir datasets'),

-- Charts
('charts', 'charts:create', 'Criar gráficos'),
('charts', 'charts:read', 'Visualizar gráficos'),
('charts', 'charts:update', 'Editar gráficos'),
('charts', 'charts:delete', 'Excluir gráficos'),

-- Dashboards
('dashboards', 'dashboards:create', 'Criar dashboards'),
('dashboards', 'dashboards:read', 'Visualizar dashboards'),
('dashboards', 'dashboards:update', 'Editar dashboards'),
('dashboards', 'dashboards:delete', 'Excluir dashboards'),
('dashboards', 'dashboards:publish', 'Publicar dashboards'),
('dashboards', 'dashboards:share', 'Compartilhar dashboards'),

-- Embed
('embed', 'embed:create', 'Criar embeds'),
('embed', 'embed:manage', 'Gerenciar embeds'),

-- RBAC
('rbac', 'rbac:read', 'Visualizar configurações de permissões'),
('rbac', 'rbac:manage', 'Gerenciar configurações de permissões'),

-- Billing
('billing', 'billing:read', 'Visualizar informações de cobrança'),
('billing', 'billing:manage', 'Gerenciar cobrança'),

-- Audit
('audit', 'audit:read', 'Visualizar logs de auditoria'),
('audit', 'audit:export', 'Exportar logs de auditoria')

ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module;