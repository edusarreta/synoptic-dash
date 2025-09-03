-- Corrigir dataset top10 para usar dados de exemplo funcionais
UPDATE saved_queries 
SET sql_query = 'SELECT 
  ''Produto A'' as produto,
  ''Categoria 1'' as categoria, 
  ''2025-01-01''::date as data_venda,
  100.50 as vendas,
  5 as quantidade,
  20.10 as preco_unitario
UNION ALL SELECT 
  ''Produto B'' as produto,
  ''Categoria 2'' as categoria,
  ''2025-01-02''::date as data_venda,
  200.75 as vendas,
  3 as quantidade,
  66.92 as preco_unitario
UNION ALL SELECT 
  ''Produto C'' as produto,
  ''Categoria 1'' as categoria,
  ''2025-01-03''::date as data_venda,
  150.25 as vendas,
  8 as quantidade,
  18.78 as preco_unitario
UNION ALL SELECT 
  ''Produto D'' as produto,
  ''Categoria 3'' as categoria,
  ''2025-01-04''::date as data_venda,
  300.00 as vendas,
  10 as quantidade,
  30.00 as preco_unitario
UNION ALL SELECT 
  ''Produto E'' as produto,
  ''Categoria 2'' as categoria,
  ''2025-01-05''::date as data_venda,
  175.50 as vendas,
  7 as quantidade,
  25.07 as preco_unitario'
WHERE id = 'c84be22a-eff3-46a0-86a4-04b0eda56bad';

-- Atualizar a conexão para usar a conexão interna do Supabase (nossa própria instância)
-- para evitar problemas de conectividade externa
UPDATE saved_queries 
SET connection_id = (
  SELECT id FROM data_connections 
  WHERE connection_type = 'postgresql' 
  AND host LIKE '%supabase%' 
  LIMIT 1
)
WHERE id = 'c84be22a-eff3-46a0-86a4-04b0eda56bad';