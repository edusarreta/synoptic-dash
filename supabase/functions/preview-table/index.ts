import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreviewRequest {
  org_id: string;
  connection_id: string;
  schema: string;
  table: string;
  limit?: number;
  offset?: number;
}

async function handleSqlPreview(config: any, schema: string, table: string, limit: number, offset: number) {
  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  
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
    console.log('🔗 PostgreSQL connected for preview');

    // Sanitize identifiers by using parameterized queries where possible
    // For table/schema names, we validate them against information_schema first
    const tableCheckResult = await client.queryObject(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'`,
      [schema, table]
    );

    if (tableCheckResult.rows.length === 0) {
      throw new Error(`Table ${schema}.${table} not found or not accessible`);
    }

    // Get column information
    const columnsResult = await client.queryObject(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2 
       ORDER BY ordinal_position`,
      [schema, table]
    );

    const columns = columnsResult.rows.map((row: any) => ({
      name: row.column_name,
      type: row.data_type
    }));

    // Safe query construction using validated identifiers
    const quotedSchema = `"${schema.replace(/"/g, '""')}"`;
    const quotedTable = `"${table.replace(/"/g, '""')}"`;
    
    const dataResult = await client.queryObject(
      `SELECT * FROM ${quotedSchema}.${quotedTable} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const rows = dataResult.rows.map(row => 
      columns.map(col => (row as any)[col.name])
    );

    return {
      success: true,
      columns,
      rows,
      total: dataResult.rows.length
    };

  } catch (error: any) {
    console.error('💥 SQL preview error:', error.message);
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
  console.log('👁️ preview-table function called');
  
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

    const { 
      org_id, 
      connection_id, 
      schema, 
      table, 
      limit = 100, 
      offset = 0 
    }: PreviewRequest = await req.json();
    
    if (!org_id || !connection_id || !schema || !table) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'org_id, connection_id, schema e table são obrigatórios' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👁️ Previewing table ${schema}.${table} for connection ${connection_id}`);

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

    // Only SQL connections support preview
    if (connection.connection_type !== 'postgresql' && connection.connection_type !== 'mysql') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Preview suportado apenas para conexões SQL (PostgreSQL/MySQL)' 
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
    
    const result = await handleSqlPreview(config, schema, table, limit, offset);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Preview function error:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: 'Falha ao fazer preview da tabela',
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})