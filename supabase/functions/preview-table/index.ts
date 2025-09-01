import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

interface PreviewRequest {
  org_id: string;
  connection_id: string;
  schema: string;
  table: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  console.log('👁️ preview-table function called');
  
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

    const { org_id, connection_id, schema, table, limit = 100, offset = 0 }: PreviewRequest = await req.json();
    console.log('👁️ Preview request:', { connection_id, schema, table, limit, offset });
    
    // Validate limit
    if (limit > 1000) {
      return errorResponse('Limite máximo é 1000 registros', 400);
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

    // Decrypt password using the same logic as list-database-catalog
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

    const startTime = Date.now();
    const previewData = await generatePreview(connection, decryptedPassword, schema, table, limit, offset);
    const elapsed = Date.now() - startTime;
    
    return successResponse({
      ...previewData,
      elapsed_ms: elapsed
    });

  } catch (error: any) {
    console.error('Function error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

async function generatePreview(connection: any, password: string, schema: string, table: string, limit: number, offset: number) {
  if (connection.connection_type === 'postgresql') {
    return await previewPostgreSQL(connection, password, schema, table, limit, offset);
  } else if (connection.connection_type === 'mysql') {
    return await previewMySQL(connection, password, schema, table, limit, offset);
  } else {
    throw new Error(`Tipo de conexão não suportado: ${connection.connection_type}`);
  }
}

async function previewPostgreSQL(connection: any, password: string, schema: string, table: string, limit: number, offset: number) {
  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  
  console.log('🔌 Attempting PostgreSQL preview connection to:', connection.host, 'database:', connection.database_name);
  
  // Sanitize password for SCRAM
  const sanitizedPassword = password.replace(/[^\x00-\x7F]/g, "");
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

    console.log(`📋 Querying ${schema}.${table} with limit ${limit}, offset ${offset}`);
    
    // Safe identifier quoting
    const quotedSchema = `"${schema.replaceAll('"', '""')}"`;
    const quotedTable = `"${table.replaceAll('"', '""')}"`;
    const sql = `SELECT * FROM ${quotedSchema}.${quotedTable} LIMIT $1 OFFSET $2`;
    
    const result = await client.queryObject(sql, [limit, offset]);

    await client.end();

    // Extract column information from the result
    const columns = result.columns ? result.columns.map((col: any) => ({
      name: col.name,
      type: col.type || 'unknown'
    })) : [];

    console.log(`✅ Preview successful: ${result.rows.length} rows, ${columns.length} columns`);
    
    // Check if results were truncated by running a count query with limit+1
    let truncated = false;
    try {
      const countResult = await client.queryObject(
        `SELECT COUNT(*) as total FROM ${quotedSchema}.${quotedTable}`
      );
      const total = parseInt(countResult.rows[0]?.total || '0');
      truncated = (offset + result.rows.length) < total;
    } catch (countError) {
      console.warn('Could not determine if results were truncated:', countError);
    }

    return {
      columns,
      rows: result.rows,
      truncated
    };

  } catch (error) {
    console.error('PostgreSQL preview error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('scram')) {
      throw new Error(`Erro de autenticação SCRAM: Verifique usuário e senha. O usuário/senha pode conter caracteres especiais não suportados.`);
    } else if (error.message.includes('password')) {
      throw new Error(`Erro de autenticação: Verifique as credenciais da conexão.`);
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`Erro de conexão: Não foi possível conectar ao servidor ${connection.host}:${connection.port}. Verifique se o servidor está online e as configurações de rede.`);
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      throw new Error(`Tabela "${schema}"."${table}" não encontrada.`);
    } else {
      throw new Error(`Erro ao fazer preview: ${error.message}`);
    }
  }
}

async function previewMySQL(connection: any, password: string, schema: string, table: string, limit: number, offset: number) {
  const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
  
  const client = await new Client().connect({
    hostname: connection.host,
    port: connection.port || 3306,
    username: connection.username,
    password: password,
    db: connection.database_name,
  });

  try {
    // Safe identifier quoting for MySQL
    const quotedSchema = `\`${schema.replaceAll('`', '``')}\``;
    const quotedTable = `\`${table.replaceAll('`', '``')}\``;
    const sql = `SELECT * FROM ${quotedSchema}.${quotedTable} LIMIT ? OFFSET ?`;
    const result = await client.execute(sql, [limit, offset]);

    await client.close();

    // Extract column information from fields
    const columns = (result.fields || []).map((field: any) => ({
      name: field.name || field,
      type: field.type || 'unknown'
    }));

    // Check if results were truncated
    let truncated = false;
    try {
      const countResult = await client.execute(
        `SELECT COUNT(*) as total FROM ${quotedSchema}.${quotedTable}`
      );
      const total = parseInt(countResult.rows?.[0]?.[0] || '0');
      truncated = (offset + (result.rows?.length || 0)) < total;
    } catch (countError) {
      console.warn('Could not determine if results were truncated:', countError);
    }

    return {
      columns,
      rows: result.rows || [],
      truncated
    };

  } catch (error) {
    console.error('MySQL preview error:', error);
    throw error;
  }
}