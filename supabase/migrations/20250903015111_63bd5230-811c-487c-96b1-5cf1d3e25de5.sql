-- Criar uma conexão interna especial para datasets locais/sintéticos
DO $$ 
DECLARE
  internal_connection_id UUID;
BEGIN
  -- Verificar se já existe uma conexão interna
  SELECT id INTO internal_connection_id 
  FROM data_connections 
  WHERE name = 'Supabase Internal' 
  LIMIT 1;
  
  -- Se não existir, criar uma
  IF internal_connection_id IS NULL THEN
    INSERT INTO data_connections (
      account_id,
      name,
      connection_type,
      host,
      database_name,
      username,
      encrypted_password,
      port,
      ssl_enabled,
      is_active,
      created_by
    ) VALUES (
      (SELECT org_id FROM profiles WHERE role = 'MASTER' LIMIT 1),
      'Supabase Internal',
      'postgresql', 
      'localhost',
      'postgres',
      'postgres',
      'encrypted_dummy_password',
      5432,
      true,
      true,
      (SELECT id FROM profiles WHERE role = 'MASTER' LIMIT 1)
    )
    RETURNING id INTO internal_connection_id;
  END IF;
  
  -- Atualizar o dataset top10 para usar a conexão interna
  UPDATE saved_queries 
  SET connection_id = internal_connection_id
  WHERE id = 'c84be22a-eff3-46a0-86a4-04b0eda56bad';
  
END $$;