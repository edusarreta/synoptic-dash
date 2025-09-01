import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

interface QueryRequest {
  org_id: string;
  connection_id: string;
  sql?: string;
  sql_query?: string;
  params?: Record<string, any>;
  row_limit?: number;
  timeout_ms?: number;
  mode?: 'preview' | 'dataset';
  dataset_name?: string;
  description?: string;
}

serve(async (req) => {
  console.log('🏃 run-sql-query function called');
  
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

    const { 
      org_id, 
      connection_id, 
      sql = null,
      sql_query = null,
      params = {}, 
      row_limit = 1000, 
      timeout_ms = 15000,
      mode = 'preview',
      dataset_name = null,
      description = null
    }: QueryRequest = await req.json();

    // Handle both sql and sql_query field names
    const sqlQuery = sql || sql_query;

    console.log('🏃 Query request:', { connection_id, mode, row_limit, has_sql: !!sqlQuery, params_count: Object.keys(params).length });

    if (!sqlQuery) {
      return errorResponse('SQL query é obrigatório', 400);
    }

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

    // Block non-SQL connections
    if (connection.connection_type === 'supabase_api' || connection.connection_type === 'rest') {
      return errorResponse('SQL Editor suporta apenas conexões PostgreSQL e MySQL', 400);
    }

    // Validate SQL - only SELECT allowed
    const sqlTrimmed = sqlQuery.trim();
    const sqlNormalized = sqlTrimmed.toLowerCase();
    
    // Block DDL/DML operations
    const forbiddenOperations = /\b(insert|update|delete|create|alter|drop|grant|revoke|truncate|merge|call)\b/i;
    if (forbiddenOperations.test(sqlNormalized)) {
      return errorResponse('Apenas consultas SELECT são permitidas', 400, 'SQL_NOT_ALLOWED');
    }

    // Block multiple statements
    if (sqlTrimmed.includes(';') && sqlTrimmed.split(';').filter(s => s.trim()).length > 1) {
      return errorResponse('Múltiplas instruções não são permitidas', 400, 'MULTI_STATEMENT');
    }

    // Process named parameters
    let processedSQL = sqlTrimmed;
    const paramBindings: any[] = [];
    let paramIndex = 1;

    // Replace :param with $1, $2, etc. for PostgreSQL or ? for MySQL
    const paramRegex = /:(\w+)\b/g;
    let match;
    while ((match = paramRegex.exec(sqlTrimmed)) !== null) {
      const paramName = match[1];
      if (params[paramName] !== undefined) {
        if (connection.connection_type === 'postgresql') {
          processedSQL = processedSQL.replace(`:${paramName}`, `$${paramIndex}`);
        } else {
          processedSQL = processedSQL.replace(`:${paramName}`, `?`);
        }
        paramBindings.push(params[paramName]);
        paramIndex++;
      }
    }

    // Ensure LIMIT is present
    if (!sqlNormalized.includes('limit')) {
      processedSQL += ` LIMIT ${row_limit}`;
    }

    console.log('🏃 Processed SQL:', processedSQL.substring(0, 100) + '...');

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

    const startTime = Date.now();
    const queryResult = await executeSQL(connection, decryptedPassword, processedSQL, paramBindings, timeout_ms);
    const elapsed_ms = Date.now() - startTime;

    const response = {
      ...queryResult,
      elapsed_ms,
      truncated: queryResult.rows.length >= row_limit
    };

    // If dataset mode, also save query if it doesn't exist
    if (mode === 'dataset') {
      try {
        // Save as dataset query
        await admin
          .from('saved_queries')
          .insert({
            org_id,
            name: `Dataset ${new Date().toLocaleString('pt-BR')}`,
            description: 'Query salva automaticamente ao criar dataset',
            sql_query: sqlTrimmed,
            connection_id,
            parameters: params,
            created_by: user.id
          });
      } catch (saveError) {
        console.warn('Could not save dataset query:', saveError);
        // Don't fail the main operation
      }
    }

    console.log('✅ Query executed successfully:', queryResult.rows.length, 'rows in', elapsed_ms, 'ms');
    return successResponse(response);

  } catch (error: any) {
    console.error('Function error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

async function executeSQL(connection: any, password: string, sql: string, params: any[], timeout_ms: number) {
  if (connection.connection_type === 'postgresql') {
    return await executePostgreSQL(connection, password, sql, params, timeout_ms);
  } else if (connection.connection_type === 'mysql') {
    return await executeMySQL(connection, password, sql, params, timeout_ms);
  } else {
    throw new Error(`Tipo de conexão não suportado: ${connection.connection_type}`);
  }
}

async function executePostgreSQL(connection: any, password: string, sql: string, params: any[], timeout_ms: number) {
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

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout_ms);
    });

    const queryPromise = client.queryObject(sql, params);
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    await client.end();

    // Extract column information
    const columns = result.rows.length > 0 
      ? Object.keys(result.rows[0])
      : [];

    return {
      columns,
      rows: result.rows.map((row: any) => Object.values(row))
    };

  } catch (error) {
    console.error('PostgreSQL execution error:', error);
    throw error;
  }
}

async function executeMySQL(connection: any, password: string, sql: string, params: any[], timeout_ms: number) {
  const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  
  const client = await new Client().connect({
    hostname: connection.host,
    port: connection.port || 3306,
    username: connection.username,
    password: password,
    db: connection.database_name,
  });

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout_ms);
    });

    const queryPromise = client.execute(sql, params);
    const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    await client.close();

    // Extract column information from fields
    const columns = (result.fields || []).map((field: any) => field.name || field);

    return {
      columns,
      rows: result.rows || []
    };

  } catch (error) {
    console.error('MySQL execution error:', error);
    throw error;
  }
}