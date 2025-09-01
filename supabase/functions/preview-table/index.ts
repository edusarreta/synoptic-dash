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

    const previewData = await generatePreview(connection, decryptedPassword, schema, table, limit, offset);
    return successResponse(previewData);

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

    // Safe query with parameters
    const sql = `SELECT * FROM "${schema}"."${table}" LIMIT $1 OFFSET $2`;
    const result = await client.queryObject(sql, [limit, offset]);

    await client.end();

    // Extract column information
    const columns = result.rows.length > 0 
      ? Object.keys(result.rows[0]).map(name => ({ name, type: 'unknown' }))
      : [];

    return {
      columns,
      rows: result.rows.map(row => Object.values(row))
    };

  } catch (error) {
    console.error('PostgreSQL preview error:', error);
    throw error;
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
    // Safe query with parameters
    const sql = `SELECT * FROM \`${schema}\`.\`${table}\` LIMIT ? OFFSET ?`;
    const result = await client.execute(sql, [limit, offset]);

    await client.close();

    // Extract column information from fields
    const columns = (result.fields || []).map((field: any) => ({
      name: field.name || field,
      type: field.type || 'unknown'
    }));

    return {
      columns,
      rows: result.rows || []
    };

  } catch (error) {
    console.error('MySQL preview error:', error);
    throw error;
  }
}