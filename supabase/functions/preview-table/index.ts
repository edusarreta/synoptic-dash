import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getPgClient, createPgClient, quoteIdent } from '../_shared/db-connection.ts'

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
  console.log('🔍 preview-table function called');

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

    const token = authHeader.replace('Bearer ', '');
    const body: PreviewRequest = await req.json();
    const { org_id, connection_id, schema, table, limit = 100, offset = 0 } = body;

    if (!org_id || !connection_id || !schema || !table) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id, connection_id, schema e table são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar limit e offset
    const safeLimit = Math.min(Math.max(1, limit), 1000); // Entre 1 e 1000
    const safeOffset = Math.max(0, offset);

    console.log('🔍 Previewing table:', { org_id, connection_id, schema, table, limit: safeLimit, offset: safeOffset });

    // Usar helper para obter config da conexão
    const dbConfig = await getPgClient(connection_id, org_id, token);
    console.log('✅ DB config obtained for preview');

    // Conectar usando helper
    const client = await createPgClient(dbConfig);

    try {
      // Validar se schema e tabela existem
      const validateQuery = `
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE';
      `;
      
      const validateResult = await client.queryObject(validateQuery, [schema, table]);
      if (validateResult.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: `Tabela ${schema}.${table} não encontrada` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obter informações das colunas
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

      // Obter dados da tabela com escape adequado
      const dataQuery = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)} LIMIT $1 OFFSET $2`;
      const dataResult = await client.queryObject(dataQuery, [safeLimit, safeOffset]);
      
      console.log('✅ Table preview retrieved:', {
        schema,
        table,
        columns: columns.length,
        rows: dataResult.rows.length
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          columns,
          rows: dataResult.rows,
          limit: safeLimit,
          offset: safeOffset,
          truncated: dataResult.rows.length === safeLimit // Indica se pode haver mais dados
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      await client.end();
    }

  } catch (error: any) {
    console.error('💥 Preview table error:', error.message);
    
    let errorMessage = 'Falha ao visualizar tabela';
    if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Conexão recusada. Verifique host, porta e firewall.';
    } else if (error.message?.includes('authentication failed') || error.message?.includes('password')) {
      errorMessage = 'Falha na autenticação. Verifique usuário e senha.';
    } else if (error.message?.includes('scram') || error.message?.includes('SSL')) {
      errorMessage = 'Erro de autenticação SSL/SCRAM. Tente desabilitar SSL.';
    } else if (error.message?.includes('does not exist')) {
      errorMessage = 'Tabela ou schema não existe.';
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
  }
})