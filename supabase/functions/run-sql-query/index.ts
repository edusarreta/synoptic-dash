import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RunQueryRequest {
  org_id: string;
  workspace_id?: string;
  connection_id: string;
  sql: string;
  params?: Record<string, any>;
  row_limit?: number;
  timeout_ms?: number;
  mode: 'preview' | 'dataset';
}

// SQL security validation
function validateSelectOnlySQL(sql: string): { valid: boolean; error?: string } {
  const trimmedSql = sql.trim().toLowerCase();
  
  // Check for multiple statements
  if (trimmedSql.includes(';') && trimmedSql.indexOf(';') < trimmedSql.length - 1) {
    return { valid: false, error: 'Múltiplas declarações SQL não são permitidas' };
  }
  
  // Must start with SELECT
  if (!trimmedSql.startsWith('select') && !trimmedSql.startsWith('with')) {
    return { valid: false, error: 'Apenas consultas SELECT são permitidas' };
  }
  
  // Block dangerous keywords
  const dangerousKeywords = [
    'insert', 'update', 'delete', 'create', 'alter', 'drop', 
    'grant', 'revoke', 'truncate', 'merge', 'call', 'exec'
  ];
  
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(trimmedSql)) {
      return { valid: false, error: `A conexão está em modo somente SELECT; palavra-chave '${keyword}' não é permitida` };
    }
  }
  
  return { valid: true };
}

// Simple parameter binding (for named parameters like :param)
function bindParameters(sql: string, params: Record<string, any>): string {
  let boundSql = sql;
  
  for (const [key, value] of Object.entries(params || {})) {
    const paramRegex = new RegExp(`:${key}\\b`, 'g');
    
    // Simple escaping - in production you'd want proper prepared statements
    let escapedValue: string;
    if (typeof value === 'string') {
      escapedValue = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number') {
      escapedValue = value.toString();
    } else if (typeof value === 'boolean') {
      escapedValue = value.toString();
    } else if (value === null || value === undefined) {
      escapedValue = 'NULL';
    } else {
      escapedValue = `'${String(value).replace(/'/g, "''")}'`;
    }
    
    boundSql = boundSql.replace(paramRegex, escapedValue);
  }
  
  return boundSql;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error_code: 'AUTH_REQUIRED', message: 'Token de autorização necessário' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error_code: 'AUTH_INVALID', message: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { 
      org_id, 
      workspace_id, 
      connection_id, 
      sql, 
      params, 
      row_limit = 5000, 
      timeout_ms = 15000, 
      mode 
    }: RunQueryRequest = await req.json();

    console.log(`🔧 Running SQL query for user ${user.id} in org ${org_id}, connection ${connection_id}`);

    // Validate membership
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ error_code: 'ORG_ACCESS_DENIED', message: 'Você não tem acesso a esta organização' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get and validate connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error_code: 'CONNECTION_NOT_FOUND', message: 'Conexão não encontrada ou inacessível' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate SQL (SELECT-only)
    const sqlValidation = validateSelectOnlySQL(sql);
    if (!sqlValidation.valid) {
      return new Response(
        JSON.stringify({ error_code: 'ONLY_SELECT_ALLOWED', message: sqlValidation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Bind parameters
    const boundSql = bindParameters(sql, params);
    
    // Add LIMIT clause if not present
    const limitedSql = boundSql.toLowerCase().includes('limit') 
      ? boundSql 
      : `${boundSql} LIMIT ${row_limit}`;

    const startTime = Date.now();
    let queryResult: any;
    let truncated = false;

    try {
      if (connection.connection_type === 'postgresql') {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port || 5432,
          password: connection.encrypted_password, // In production, decrypt this
          tls: connection.ssl_enabled ? { enabled: true, enforce: false } : 'disable',
        });

        // Set up timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('QUERY_TIMEOUT')), timeout_ms);
        });

        const queryPromise = (async () => {
          await client.connect();
          console.log('✅ Connected to database');
          
          const result = await client.queryObject(limitedSql);
          await client.end();
          
          return {
            columns: result.columns || [],
            rows: result.rows || [],
            rowCount: result.rowCount || 0
          };
        })();

        queryResult = await Promise.race([queryPromise, timeoutPromise]);
        
        // Check if results were truncated
        truncated = queryResult.rows.length >= row_limit;
        
      } else {
        throw new Error(`Tipo de conexão não suportado: ${connection.connection_type}`);
      }

      const elapsedMs = Date.now() - startTime;

      // Log usage for audit and billing
      if (mode === 'dataset') {
        // In production, debit 1 credit here
        console.log(`💳 Debiting 1 credit for dataset creation for user ${user.id}`);
      }

      // Log to audit
      console.log(`📊 Query executed: ${elapsedMs}ms, ${queryResult.rows.length} rows, truncated: ${truncated}`);

      return new Response(
        JSON.stringify({
          columns: queryResult.columns,
          rows: queryResult.rows,
          truncated,
          elapsed_ms: elapsedMs,
          row_count: queryResult.rows.length
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (queryError: any) {
      console.error('❌ Query execution failed:', queryError);
      
      let errorCode = 'QUERY_FAILED';
      let errorMessage = queryError.message;
      
      if (queryError.message === 'QUERY_TIMEOUT') {
        errorCode = 'QUERY_TIMEOUT';
        errorMessage = `Query timeout após ${timeout_ms}ms`;
      } else if (queryError.message.includes('syntax error')) {
        errorCode = 'SYNTAX_ERROR';
        errorMessage = 'Erro de sintaxe SQL';
      } else if (queryError.message.includes('permission denied')) {
        errorCode = 'PERMISSION_DENIED';
        errorMessage = 'Permissão negada para executar esta query';
      }
      
      return new Response(
        JSON.stringify({ 
          error_code: errorCode,
          message: errorMessage
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error_code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor', 
        error_message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});