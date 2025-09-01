import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CatalogRequest {
  org_id: string;
  connection_id: string;
}

async function handleSqlCatalog(config: any) {
  console.log('🔌 Starting SQL catalog with config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    hasPassword: !!config.password,
    ssl_mode: config.ssl_mode,
    connection_type: config.connection_type
  });

  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  
  // Create client with proper SSL settings
  const client = new Client({
    user: config.user,
    database: config.database,
    hostname: config.host,
    port: config.port,
    password: config.password,
    tls: config.ssl_mode === 'require' ? { enabled: true, enforce: false } : false,
  });

  try {
    await client.connect();
    console.log('🔗 PostgreSQL connected successfully');

    // Query to get schemas and tables with column info
    const result = await client.queryObject(`
      SELECT 
        t.table_schema,
        t.table_name,
        COUNT(c.column_name) as column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_schema, t.table_name
      ORDER BY t.table_schema, t.table_name
    `);

    // Query to get columns separately for better performance
    const columnsResult = await client.queryObject(`
      SELECT 
        table_schema as schema,
        table_name as table,
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY table_schema, table_name, ordinal_position
    `);

    // Group columns by schema and table
    const columnsByTable: any = {};
    for (const col of columnsResult.rows) {
      const key = `${col.schema}.${col.table}`;
      if (!columnsByTable[key]) {
        columnsByTable[key] = [];
      }
      columnsByTable[key].push({
        name: col.name,
        type: col.type,
        nullable: col.nullable
      });
    }

    // Group by schema
    const schemas: any = {};
    for (const row of result.rows) {
      const schemaName = row.table_schema as string;
      const tableName = row.table_name as string;
      const tableKey = `${schemaName}.${tableName}`;
      
      if (!schemas[schemaName]) {
        schemas[schemaName] = {
          name: schemaName,
          tables: []
        };
      }
      
      schemas[schemaName].tables.push({
        name: tableName,
        column_count: row.column_count,
        columns: columnsByTable[tableKey] || []
      });
    }

    const catalogData = {
      db: config.database,
      schemas: Object.values(schemas)
    };

    return {
      success: true,
      data: catalogData
    };

  } catch (error: any) {
    console.error('💥 PostgreSQL catalog error:', error.message);
    throw error;
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      console.warn('Warning closing DB connection:', closeError);
    }
  }
}

serve(async (req) => {
  console.log('📋 list-database-catalog function called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { org_id, connection_id }: CatalogRequest = await req.json();
    
    if (!org_id || !connection_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id e connection_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Listing catalog for connection ${connection_id} in org ${org_id}`);

    // Validate membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Você não tem acesso a esta organização' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection config
    const { data: connection, error: connError } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, message: 'Conexão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if connection type is supported for catalog
    if (connection.connection_type === 'supabase_api') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Catálogo não suportado para conexões Supabase API. Use uma conexão SQL direta.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt password if needed
    let password = connection.encrypted_password;
    if (password) {
      try {
        const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
          body: { encrypted_password: password }
        });
        
        if (decryptError || !decryptData?.success) {
          throw new Error('Failed to decrypt password');
        }
        
        password = decryptData.password;
      } catch (decryptError) {
        console.error('Password decryption failed:', decryptError);
        return new Response(
          JSON.stringify({ success: false, message: 'Falha ao descriptografar senha' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const config = {
      host: connection.host,
      port: connection.port,
      database: connection.database_name,
      user: connection.username,
      password: password,
      ssl_mode: connection.ssl_enabled ? 'require' : 'disable',
      connection_type: connection.connection_type
    };

    console.log('✅ Connection config obtained:', {
      host: config.host,
      database: config.database,
      user: config.user,
      hasPassword: !!config.password,
      ssl_mode: config.ssl_mode
    });
    
    // Handle SQL databases only (PostgreSQL/MySQL)
    if (config.connection_type === 'postgresql' || config.connection_type === 'mysql') {
      const result = await handleSqlCatalog(config);
      
      return new Response(
        JSON.stringify(result.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Tipo de conexão '${config.connection_type}' não suportado para catálogo` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('💥 Catalog function error:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Falha ao listar catálogo',
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})