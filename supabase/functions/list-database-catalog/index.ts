import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

interface CatalogRequest {
  org_id: string;
  connection_id: string;
}

serve(async (req) => {
  console.log('📋 list-database-catalog function called');
  
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    const admin = adminClient();
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Token de autorização necessário', 401);
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('Token inválido', 401);
    }

    const { org_id, connection_id }: CatalogRequest = await req.json();
    console.log('📋 Listing catalog for connection', connection_id, 'in org', org_id);

    // Validate membership
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return errorResponse('Você não tem acesso a esta organização', 403);
    }

    // Get connection details
    const { data: connection, error: connectionError } = await admin
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .single();

    if (connectionError || !connection) {
      return errorResponse('Conexão não encontrada', 404);
    }

    // Handle Supabase API separately  
    if (connection.connection_type === 'supabase_api') {
      return errorResponse(
        'Use conexão SQL para Catálogo/SQL Editor; Supabase API virá no próximo ciclo.',
        400
      );
    }

    // Decrypt password using the same logic as decrypt-password function
    const key = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!key) {
      return errorResponse('Chave de criptografia não configurada', 500);
    }

    let decryptedPassword: string;
    try {
      // Use the robust decryption logic
      const decoded = atob(connection.encrypted_password);
      
      // Try different formats for backward compatibility
      if (decoded.includes('::')) {
        // Format: password::key_prefix
        const parts = decoded.split('::');
        if (parts.length === 2 && parts[1] === key.slice(0, 8)) {
          decryptedPassword = parts[0];
        } else {
          throw new Error('Invalid encrypted password format');
        }
      } else {
        // Direct decryption (assume the password is directly encoded)
        decryptedPassword = decoded;
      }
      
      console.log('🔓 Password decrypted successfully');
    } catch (decryptError) {
      console.error('❌ Password decryption failed:', decryptError);
      return errorResponse('Erro ao descriptografar senha da conexão', 500);
    }

    // Validate decrypted password
    if (!decryptedPassword) {
      console.error('❌ Decrypted password is empty');
      return errorResponse('Senha descriptografada está vazia', 500);
    }

    const catalogData = await generateCatalog(connection, decryptedPassword);
    return successResponse(catalogData);

  } catch (error: any) {
    console.error('❌ Function error:', error);
    return errorResponse(`Erro interno do servidor: ${error.message}`, 500);
  }
});

async function generateCatalog(connection: any, password: string) {
  if (connection.connection_type === 'postgresql') {
    return await generatePostgreSQLCatalog(connection, password);
  } else if (connection.connection_type === 'mysql') {
    return await generateMySQLCatalog(connection, password);
  } else {
    throw new Error(`Tipo de conexão não suportado: ${connection.connection_type}`);
  }
}

async function generatePostgreSQLCatalog(connection: any, password: string) {
  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  
  console.log('🔌 Attempting PostgreSQL connection to:', connection.host, 'database:', connection.database_name);
  
  // Sanitize and validate password for SCRAM
  const sanitizedPassword = password.replace(/[^\x00-\x7F]/g, ""); // Remove non-ASCII characters
  if (sanitizedPassword !== password) {
    console.warn('⚠️ Password contained non-ASCII characters, sanitized for SCRAM');
  }
  
  const pgConfig: any = {
    user: connection.username,
    database: connection.database_name,
    hostname: connection.host,
    port: connection.port || 5432,
    password: sanitizedPassword,
    connection: {
      attempts: 3,
      interval: 1000
    }
  };

  // Configure SSL based on connection config
  const sslMode = connection.connection_config?.ssl_mode || (connection.ssl_enabled ? 'require' : 'disable');
  console.log('🔒 SSL Mode:', sslMode);
  
  if (sslMode === 'disable' || sslMode === false) {
    pgConfig.tls = { enabled: false };
  } else if (sslMode === 'require') {
    pgConfig.tls = { 
      enabled: true, 
      enforce: false,
      caCertificates: []
    };
  } else {
    pgConfig.tls = { 
      enabled: true, 
      enforce: true,
      caCertificates: []
    };
  }

  const client = new Client(pgConfig);
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ PostgreSQL connection successful');

    // Test basic query first
    console.log('🧪 Testing basic query...');
    await client.queryObject('SELECT 1 as test');
    console.log('✅ Basic query successful');

    // Get schemas, tables, views and materialized views
    console.log('📋 Fetching tables, views and materialized views...');
    
    // First get regular tables and views
    const tablesResult = await client.queryObject(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND table_type IN ('BASE TABLE', 'VIEW', 'FOREIGN TABLE', 'LOCAL TEMPORARY')
      ORDER BY table_schema, table_name
    `);
    
    // Get materialized views (they don't appear in information_schema.tables)
    const matViewsResult = await client.queryObject(`
      SELECT schemaname as table_schema, matviewname as table_name, 'MATERIALIZED VIEW' as table_type
      FROM pg_matviews
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schemaname, matviewname
    `);
    
    // Combine results
    const allTables = [...(tablesResult.rows || []), ...(matViewsResult.rows || [])];
    console.log(`📋 Found ${allTables.length} tables, views and materialized views`);

    // Get columns
    console.log('📋 Fetching columns...');
    const columnsResult = await client.queryObject(`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name, ordinal_position
    `);
    console.log(`📋 Found ${columnsResult.rows.length} columns`);

    await client.end();

    // Organize data
    const schemasMap = new Map();
    
    // Group tables by schema (using combined results)
    for (const row of allTables as any[]) {
      const schemaName = row.table_schema;
      const tableName = row.table_name;
      const tableType = row.table_type;
      
      if (!schemasMap.has(schemaName)) {
        schemasMap.set(schemaName, { name: schemaName, tables: [] });
      }
      
      // Map table types to our internal format
      let kind = 'table';
      if (tableType === 'VIEW') kind = 'view';
      else if (tableType === 'MATERIALIZED VIEW') kind = 'materialized_view';
      else if (tableType === 'FOREIGN TABLE') kind = 'foreign_table';
      
      schemasMap.get(schemaName).tables.push({
        name: tableName,
        kind: kind,
        columns: [],
        column_count: 0
      });
    }

    // Add columns to tables
    for (const row of columnsResult.rows as any[]) {
      const schemaName = row.table_schema;
      const tableName = row.table_name;
      const schema = schemasMap.get(schemaName);
      
      if (schema) {
        const table = schema.tables.find((t: any) => t.name === tableName);
        if (table) {
          table.columns.push({
            name: row.column_name,
            type: row.data_type
          });
        }
      }
    }

    // Calculate column counts
    for (const schema of schemasMap.values()) {
      for (const table of schema.tables) {
        table.column_count = table.columns.length;
      }
    }

    const result = {
      db: connection.database_name,
      schemas: Array.from(schemasMap.values())
    };
    
    console.log(`✅ Successfully generated catalog with ${result.schemas.length} schemas`);
    return result;

  } catch (error) {
    console.error('❌ PostgreSQL catalog error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('scram')) {
      throw new Error(`Erro de autenticação SCRAM: Verifique usuário e senha. O usuário/senha pode conter caracteres especiais não suportados.`);
    } else if (error.message.includes('password')) {
      throw new Error(`Erro de autenticação: Verifique as credenciais da conexão.`);
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`Erro de conexão: Não foi possível conectar ao servidor ${connection.host}:${connection.port}. Verifique se o servidor está online e as configurações de rede.`);
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      throw new Error(`Banco de dados "${connection.database_name}" não encontrado.`);
    } else {
      throw new Error(`Erro ao conectar no PostgreSQL: ${error.message}`);
    }
  }
}

async function generateMySQLCatalog(connection: any, password: string) {
  const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  
  const client = await new Client().connect({
    hostname: connection.host,
    port: connection.port || 3306,
    username: connection.username,
    password: password,
    db: connection.database_name,
  });

  try {
    // Get tables and views
    const tablesResult = await client.execute(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM information_schema.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    // Get columns
    const columnsResult = await client.execute(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM information_schema.COLUMNS
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);

    await client.close();

    // Organize data
    const schemasMap = new Map();
    
    // Group tables by schema
    for (const row of tablesResult.rows || []) {
      const schemaName = row[0];
      const tableName = row[1];
      const tableType = row[2];
      
      if (!schemasMap.has(schemaName)) {
        schemasMap.set(schemaName, { name: schemaName, tables: [] });
      }
      
      const kind = tableType === 'VIEW' ? 'view' : 'table';
      
      schemasMap.get(schemaName).tables.push({
        name: tableName,
        kind: kind,
        columns: [],
        column_count: 0
      });
    }

    // Add columns to tables
    for (const row of columnsResult.rows || []) {
      const schemaName = row[0];
      const tableName = row[1];
      const schema = schemasMap.get(schemaName);
      
      if (schema) {
        const table = schema.tables.find((t: any) => t.name === tableName);
        if (table) {
          table.columns.push({
            name: row[2],
            type: row[3]
          });
        }
      }
    }

    // Calculate column counts
    for (const schema of schemasMap.values()) {
      for (const table of schema.tables) {
        table.column_count = table.columns.length;
      }
    }

    return {
      db: connection.database_name,
      schemas: Array.from(schemasMap.values())
    };

  } catch (error) {
    console.error('MySQL catalog error:', error);
    throw error;
  }
}