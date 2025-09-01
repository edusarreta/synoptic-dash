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

    // Decrypt password
    const key = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!key) {
      return errorResponse('Chave de criptografia não configurada', 500);
    }

    let decryptedPassword: string;
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const encrypted = new Uint8Array(atob(connection.encrypted_password).split('').map(c => c.charCodeAt(0)));
      const decrypted = new Uint8Array(encrypted.length);
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyData[i % keyData.length];
      }
      
      decryptedPassword = new TextDecoder().decode(decrypted);
    } catch (decryptError) {
      console.error('❌ Password decryption failed:', decryptError);
      return errorResponse('Erro ao descriptografar senha', 500);
    }

    const catalogData = await generateCatalog(connection, decryptedPassword);
    return successResponse(catalogData);

  } catch (error: any) {
    console.error('Function error:', error);
    return errorResponse('Erro interno do servidor', 500);
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
  
  const pgConfig: any = {
    user: connection.username,
    database: connection.database_name,
    hostname: connection.host,
    port: connection.port || 5432,
    password: password,
  };

  // Configure SSL
  const sslMode = connection.connection_config?.ssl_mode || 'require';
  if (sslMode === 'disable') {
    pgConfig.tls = { enabled: false };
  } else {
    pgConfig.tls = { enabled: true, enforce: false };
  }

  const client = new Client(pgConfig);
  
  try {
    await client.connect();

    // Get schemas and tables
    const tablesResult = await client.queryObject(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);

    // Get columns
    const columnsResult = await client.queryObject(`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      ORDER BY table_schema, table_name, ordinal_position
    `);

    await client.end();

    // Organize data
    const schemasMap = new Map();
    
    // Group tables by schema
    for (const row of tablesResult.rows as any[]) {
      const schemaName = row.table_schema;
      const tableName = row.table_name;
      
      if (!schemasMap.has(schemaName)) {
        schemasMap.set(schemaName, { name: schemaName, tables: [] });
      }
      
      schemasMap.get(schemaName).tables.push({
        name: tableName,
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

    return {
      db: connection.database_name,
      schemas: Array.from(schemasMap.values())
    };

  } catch (error) {
    console.error('PostgreSQL catalog error:', error);
    throw error;
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
    // Get tables
    const tablesResult = await client.execute(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
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
      
      if (!schemasMap.has(schemaName)) {
        schemasMap.set(schemaName, { name: schemaName, tables: [] });
      }
      
      schemasMap.get(schemaName).tables.push({
        name: tableName,
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