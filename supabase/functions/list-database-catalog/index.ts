import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CatalogRequest {
  org_id: string;
  connection_id: string;
}

serve(async (req) => {
  console.log('📋 list-database-catalog function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CatalogRequest = await req.json();
    const { org_id, connection_id } = body;

    if (!org_id || !connection_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id e connection_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Listing catalog for connection ${connection_id} in org ${org_id}`);

    // Verify user has permission and connection belongs to org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection details and verify ownership
    const { data: connection, error: connError } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      console.error('Connection fetch error:', connError);
      return new Response(
        JSON.stringify({ success: false, message: 'Conexão não encontrada ou inativa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only support PostgreSQL connections
    if (!['postgresql', 'supabase', 'POSTGRES'].includes(connection.connection_type)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Catálogo disponível apenas para conexões PostgreSQL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt password
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
      body: { encrypted_password: connection.encrypted_password }
    });

    if (decryptError || !decryptData?.decrypted_password) {
      console.error('Password decryption failed:', decryptError);
      return new Response(
        JSON.stringify({ success: false, message: 'Falha na descriptografia da senha' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connect to PostgreSQL database
    const pgConfig = {
      hostname: connection.host,
      port: connection.port,
      database: connection.database_name,
      user: connection.username,
      password: decryptData.decrypted_password,
      tls: connection.ssl_enabled !== false ? { enabled: true, enforce: false } : { enabled: false }
    };

    try {
      // Import PostgreSQL client dynamically
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new Client(pgConfig);
      
      await client.connect();

      // Get all schemas and tables
      const schemaQuery = `
        SELECT 
          t.table_schema,
          t.table_name,
          COUNT(c.column_name) as column_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON (
          t.table_schema = c.table_schema AND 
          t.table_name = c.table_name
        )
        WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        GROUP BY t.table_schema, t.table_name
        ORDER BY t.table_schema, t.table_name;
      `;
      
      const schemaResult = await client.queryObject(schemaQuery);
      
      // Get detailed columns for each table
      const columnsQuery = `
        SELECT 
          c.table_schema,
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable
        FROM information_schema.columns c
        JOIN information_schema.tables t ON (
          c.table_schema = t.table_schema AND 
          c.table_name = t.table_name
        )
        WHERE t.table_type = 'BASE TABLE'
          AND c.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY c.table_schema, c.table_name, c.ordinal_position;
      `;
      
      const columnsResult = await client.queryObject(columnsQuery);
      
      await client.end();

      // Build nested structure
      const schemasMap = new Map();
      
      // Process tables first
      for (const row of schemaResult.rows) {
        const schemaName = row.table_schema as string;
        const tableName = row.table_name as string;
        const columnCount = parseInt(row.column_count as string) || 0;
        
        if (!schemasMap.has(schemaName)) {
          schemasMap.set(schemaName, {
            name: schemaName,
            tables: []
          });
        }
        
        schemasMap.get(schemaName).tables.push({
          name: tableName,
          column_count: columnCount,
          columns: []
        });
      }
      
      // Process columns
      for (const row of columnsResult.rows) {
        const schemaName = row.table_schema as string;
        const tableName = row.table_name as string;
        const columnName = row.column_name as string;
        const dataType = row.data_type as string;
        const isNullable = row.is_nullable === 'YES';
        
        const schema = schemasMap.get(schemaName);
        if (schema) {
          const table = schema.tables.find((t: any) => t.name === tableName);
          if (table) {
            table.columns.push({
              name: columnName,
              type: dataType,
              nullable: isNullable
            });
          }
        }
      }

      const schemas = Array.from(schemasMap.values());

      console.log('Database catalog retrieved successfully:', {
        schemas: schemas.length,
        totalTables: schemas.reduce((acc, s) => acc + s.tables.length, 0)
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          db: connection.database_name,
          schemas
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      
      let errorMessage = 'Falha na consulta ao banco de dados';
      if (dbError.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Conexão recusada. Verifique host, porta e firewall.';
      } else if (dbError.message?.includes('password authentication failed')) {
        errorMessage = 'Falha na autenticação. Verifique usuário e senha.';
      } else if (dbError.message?.includes('SSL')) {
        errorMessage = 'Erro SSL. Verifique as configurações de SSL.';
      } else if (dbError.message?.includes('timeout')) {
        errorMessage = 'Timeout na consulta. O banco pode estar sobrecarregado.';
      }

      return new Response(
        JSON.stringify({ success: false, message: errorMessage, details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})