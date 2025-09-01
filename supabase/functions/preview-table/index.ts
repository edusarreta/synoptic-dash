import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PreviewRequest {
  org_id: string;
  connection_id: string;
  schema: string;
  table: string;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  console.log('preview-table function called');

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

    const body: PreviewRequest = await req.json();
    const { org_id, connection_id, schema, table, limit = 100, offset = 0 } = body;

    if (!org_id || !connection_id || !schema || !table) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id, connection_id, schema e table são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate limit and offset
    const safeLimit = Math.min(Math.max(1, limit), 1000); // Between 1 and 1000
    const safeOffset = Math.max(0, offset);

    console.log('Previewing table:', { org_id, connection_id, schema, table, limit: safeLimit, offset: safeOffset });

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
        JSON.stringify({ success: false, message: 'Preview disponível apenas para conexões PostgreSQL' }),
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
      username: connection.username,
      password: decryptData.decrypted_password,
      tls: connection.ssl_enabled !== false ? { enabled: true, enforce: false } : { enabled: false }
    };

    try {
      // Import PostgreSQL client dynamically
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new Client(pgConfig);
      
      await client.connect();

      // Validate schema and table exist
      const validateQuery = `
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE';
      `;
      
      const validateResult = await client.queryObject(validateQuery, [schema, table]);
      if (validateResult.rows.length === 0) {
        await client.end();
        return new Response(
          JSON.stringify({ success: false, message: `Tabela ${schema}.${table} não encontrada` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get column information
      const columnQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2 
        ORDER BY ordinal_position;
      `;
      
      const columnResult = await client.queryObject(columnQuery, [schema, table]);
      const columns = columnResult.rows.map(row => ({
        name: row.column_name as string,
        type: row.data_type as string,
        nullable: row.is_nullable === 'YES'
      }));

      // Get table data with proper quoting for identifiers
      const dataQuery = `SELECT * FROM "${schema}"."${table}" LIMIT $1 OFFSET $2`;
      const dataResult = await client.queryObject(dataQuery, [safeLimit, safeOffset]);
      
      // Get total count (optional, can be expensive for large tables)
      const countQuery = `SELECT COUNT(*) as total FROM "${schema}"."${table}"`;
      const countResult = await client.queryObject(countQuery);
      const total = countResult.rows[0]?.total as number || 0;

      await client.end();

      console.log('Table preview retrieved successfully:', {
        schema,
        table,
        columns: columns.length,
        rows: dataResult.rows.length,
        total
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          columns,
          rows: dataResult.rows,
          total,
          limit: safeLimit,
          offset: safeOffset
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
        errorMessage = 'Timeout na consulta. A tabela pode ser muito grande.';
      } else if (dbError.message?.includes('does not exist')) {
        errorMessage = 'Tabela ou schema não existe.';
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