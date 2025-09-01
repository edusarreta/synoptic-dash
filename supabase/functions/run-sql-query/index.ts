import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPgClient, createPgClient } from '../_shared/db-connection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RunSqlQueryRequest {
  org_id: string;
  workspace_id?: string;
  connection_id: string;
  sql: string;
  params?: Record<string, any>;
  row_limit?: number;
  timeout_ms?: number;
  mode: 'preview' | 'dataset';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error_code: 'AUTHORIZATION_REQUIRED',
        message: 'Token de autorização necessário' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Parse request body
    const { 
      org_id, 
      connection_id, 
      sql, 
      params = {}, 
      row_limit = 1000,
      timeout_ms = 15000,
      mode = 'preview'
    }: RunSqlQueryRequest = await req.json();

    if (!org_id || !connection_id || !sql) {
      return new Response(JSON.stringify({ 
        error_code: 'MISSING_REQUIRED_PARAMS',
        message: 'org_id, connection_id e sql são obrigatórios' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔧 Running SQL query:', { org_id, connection_id, mode, sql: sql.substring(0, 100) + '...' });

    // Validação mais permissiva para SELECT
    const cleanSql = sql.trim().toLowerCase();
    
    // Verificar múltiplos statements
    const sqlStatements = cleanSql.split(';').filter(s => s.trim());
    if (sqlStatements.length > 1 && sqlStatements[sqlStatements.length - 1] !== '') {
      return new Response(JSON.stringify({ 
        error_code: 'MULTIPLE_STATEMENTS',
        message: 'Apenas uma consulta SELECT por vez.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é SELECT (mais flexível)
    const isSelectQuery = /^\s*select\b/i.test(cleanSql);
    
    // Verificar palavras-chave perigosas (mais restritivo)
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'create', 'alter', 'drop', 
      'grant', 'revoke', 'truncate', 'merge', 'call', 'execute'
    ];
    
    const containsForbidden = forbiddenKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(cleanSql);
    });

    if (!isSelectQuery || containsForbidden) {
      return new Response(JSON.stringify({ 
        error_code: 'ONLY_SELECT_ALLOWED',
        message: 'Apenas consultas SELECT são permitidas por segurança' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usar helper para obter config da conexão
    const dbConfig = await getPgClient(connection_id, org_id, token);
    console.log('✅ DB config obtained for SQL execution');

    // Processar parâmetros nomeados se existirem
    let parameterizedSql = sql;
    const paramNames = Object.keys(params);
    
    for (const paramName of paramNames) {
      const paramValue = params[paramName];
      const paramRegex = new RegExp(`:${paramName}\\b`, 'g');
      parameterizedSql = parameterizedSql.replace(paramRegex, 
        typeof paramValue === 'string' ? `'${paramValue.replace(/'/g, "''")}'` : String(paramValue)
      );
    }

    // Adicionar LIMIT se não presente
    if (!cleanSql.includes(' limit ')) {
      parameterizedSql += ` LIMIT ${Math.min(row_limit, 10000)}`;
    }

    // Executar query
    const startTime = Date.now();
    const client = await createPgClient(dbConfig);
    
    try {
      console.log('🔧 Executing SQL query');
      const result = await client.queryObject(parameterizedSql);
      const elapsedMs = Date.now() - startTime;

      // Formatar resposta
      const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
      const rows = result.rows.map(row => Object.values(row));

      const queryResult = {
        columns,
        rows,
        truncated: result.rows.length >= Math.min(row_limit, 10000),
        elapsed_ms: elapsedMs
      };

      console.log(`✅ Query executed successfully. Rows: ${queryResult.rows.length}, Time: ${elapsedMs}ms`);

      return new Response(JSON.stringify(queryResult), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('SQL query execution error:', error);
    return new Response(JSON.stringify({ 
      error_code: 'INTERNAL_ERROR',
      message: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});