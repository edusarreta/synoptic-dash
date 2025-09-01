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
      console.log('❌ No authorization header');
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

    console.log('✅ User authenticated:', user.id);

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
      console.log('❌ Access denied - user not in org');
      return new Response(
        JSON.stringify({ success: false, message: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authorized for org:', profile.org_id);

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

    console.log('✅ Connection found:', connection.name, connection.connection_type);

    // Only support PostgreSQL connections for now
    if (!['postgresql', 'supabase', 'postgres'].includes(connection.connection_type.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: false, message: 'Catálogo disponível apenas para conexões PostgreSQL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt password
    let decryptedPassword = connection.encrypted_password;
    try {
      const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
        body: { encrypted_password: connection.encrypted_password }
      });

      if (decryptError) {
        console.warn('Password decryption failed, trying raw:', decryptError);
        // Fallback to using password as-is if decryption fails
        decryptedPassword = connection.encrypted_password;
      } else if (decryptData?.decrypted_password) {
        decryptedPassword = decryptData.decrypted_password;
      }
    } catch (e) {
      console.warn('Decrypt function error, using raw password:', e);
    }

    console.log('🔐 Password processed for connection');

    // Connect to PostgreSQL database
    const pgConfig = {
      hostname: connection.host,
      port: connection.port || 5432,
      database: connection.database_name,
      user: connection.username,
      password: decryptedPassword,
      tls: connection.ssl_enabled !== false ? { enabled: true, enforce: false } : { enabled: false }
    };

    console.log('🔌 Connecting to PostgreSQL:', {
      hostname: pgConfig.hostname,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      ssl: pgConfig.tls.enabled
    });

    try {
      // Import PostgreSQL client dynamically
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new Client(pgConfig);
      
      await client.connect();
      console.log('✅ Connected to PostgreSQL');

      // Simple query to get schemas and tables
      const schemaQuery = `
        SELECT 
          schemaname as schema_name,
          tablename as table_name,
          0 as column_count
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename
        LIMIT 100;
      `;
      
      const result = await client.queryObject(schemaQuery);
      console.log(`📊 Found ${result.rows.length} tables`);
      
      await client.end();

      // Build simple structure
      const schemasMap = new Map();
      
      for (const row of result.rows) {
        const schemaName = row.schema_name as string;
        const tableName = row.table_name as string;
        
        if (!schemasMap.has(schemaName)) {
          schemasMap.set(schemaName, {
            name: schemaName,
            tables: []
          });
        }
        
        schemasMap.get(schemaName).tables.push({
          name: tableName,
          column_count: 0,
          columns: []
        });
      }

      const schemas = Array.from(schemasMap.values());

      console.log('✅ Catalog data prepared:', {
        schemas: schemas.length,
        totalTables: schemas.reduce((acc: number, s: any) => acc + s.tables.length, 0)
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
      console.error('💥 Database connection error:', dbError);
      
      let errorMessage = 'Falha na conexão com o banco de dados';
      if (dbError.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Conexão recusada. Verifique host, porta e firewall.';
      } else if (dbError.message?.includes('password authentication failed')) {
        errorMessage = 'Falha na autenticação. Verifique usuário e senha.';
      } else if (dbError.message?.includes('SSL')) {
        errorMessage = 'Erro SSL. Verifique as configurações de SSL.';
      } else if (dbError.message?.includes('timeout')) {
        errorMessage = 'Timeout na conexão. O banco pode estar sobrecarregado.';
      } else if (dbError.message?.includes('Missing connection parameters')) {
        errorMessage = 'Parâmetros de conexão inválidos. Verifique a configuração.';
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: errorMessage, 
          details: dbError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})