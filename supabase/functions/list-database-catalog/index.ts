import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getPgClient, createPgClient, quoteIdent } from '../_shared/db-connection.ts'

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

    const token = authHeader.replace('Bearer ', '');
    const body: CatalogRequest = await req.json();
    const { org_id, connection_id } = body;

    if (!org_id || !connection_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id e connection_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Listing catalog for connection ${connection_id} in org ${org_id}`);

    // Usar helper para obter config da conexão
    const dbConfig = await getPgClient(connection_id, org_id, token);
    console.log('✅ DB config obtained');

    // Conectar usando helper
    const client = await createPgClient(dbConfig);

    try {
      // Query simplificada para listar schemas e tabelas
      const schemaQuery = `
        SELECT 
          schemaname as schema_name,
          tablename as table_name
        FROM pg_tables 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schemaname, tablename
        LIMIT 100;
      `;
      
      const result = await client.queryObject(schemaQuery);
      console.log(`📊 Found ${result.rows.length} tables`);
      
      // Construir estrutura simples
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
          column_count: 0, // Será obtido no preview
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
          db: dbConfig.database,
          schemas
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('💥 Database catalog error:', error.message);
    
    let errorMessage = 'Falha ao carregar catálogo';
    if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Conexão recusada. Verifique host, porta e firewall.';
    } else if (error.message?.includes('authentication failed') || error.message?.includes('password')) {
      errorMessage = 'Falha na autenticação. Verifique usuário e senha.';
    } else if (error.message?.includes('scram') || error.message?.includes('SSL')) {
      errorMessage = 'Erro de autenticação SSL/SCRAM. Tente desabilitar SSL.';
    } else if (error.message?.includes('Acesso negado')) {
      errorMessage = error.message;
    } else if (error.message?.includes('Token inválido')) {
      errorMessage = error.message;
    } else if (error.message?.includes('Conexão não encontrada')) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage,
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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