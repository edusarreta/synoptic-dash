import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { 
      org_id, 
      connection_id, 
      sql, 
      params = {}, 
      row_limit = 5000,
      timeout_ms = 15000,
      mode 
    }: RunSqlQueryRequest = await req.json();

    // Validate org membership and permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check sql:run permission (simplified check for now)
    const canRunSQL = ['MASTER', 'ADMIN', 'EDITOR'].includes(profile.role);
    if (!canRunSQL) {
      return new Response(JSON.stringify({ 
        error_code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Not authorized to run SQL queries' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get and validate connection
    const { data: connection } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ 
        error_code: 'CONNECTION_NOT_FOUND',
        message: 'Data connection not found or inactive' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate SQL is SELECT-only (improved validation)
    const cleanSql = sql.trim().toLowerCase().replace(/\s+/g, ' ');
    const sqlStatements = cleanSql.split(';').filter(s => s.trim());
    
    // Check for multiple statements
    if (sqlStatements.length > 1) {
      return new Response(JSON.stringify({ 
        error_code: 'MULTIPLE_STATEMENTS',
        message: 'Multiple SQL statements not allowed. Use only SELECT queries.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for forbidden keywords (DDL/DML) - more robust check
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'create', 'alter', 'drop', 
      'grant', 'revoke', 'truncate', 'merge', 'call', 'execute'
    ];
    
    const containsForbidden = forbiddenKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(cleanSql);
    });

    // More flexible SELECT validation - allow 'select*', 'select now()', etc.
    const isSelectQuery = /^select(\s|\*|$)/i.test(cleanSql.trim());

    if (containsForbidden || !isSelectQuery) {
      return new Response(JSON.stringify({ 
        error_code: 'ONLY_SELECT_ALLOWED',
        message: 'Only SELECT queries are allowed for security reasons' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt password
    const { data: decryptResult, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
      body: { encrypted_password: connection.encrypted_password }
    });

    if (decryptError || !decryptResult?.decrypted_password) {
      console.error('Decryption failed:', decryptError);
      return new Response(JSON.stringify({ 
        error_code: 'DECRYPTION_FAILED',
        message: 'Failed to decrypt connection password' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Replace named parameters in SQL
    let parameterizedSql = sql;
    const paramNames = Object.keys(params);
    
    for (const paramName of paramNames) {
      const paramValue = params[paramName];
      // Simple parameter replacement (in production, use proper prepared statements)
      const paramRegex = new RegExp(`:${paramName}\\b`, 'g');
      parameterizedSql = parameterizedSql.replace(paramRegex, 
        typeof paramValue === 'string' ? `'${paramValue.replace(/'/g, "''")}'` : String(paramValue)
      );
    }

    // Add LIMIT clause if not present
    if (!cleanSql.includes(' limit ')) {
      parameterizedSql += ` LIMIT ${Math.min(row_limit, 10000)}`;
    }

    // Execute query with timeout
    const startTime = Date.now();
    
    try {
      // Execute real query based on connection type
      if (connection.connection_type === 'postgresql' || connection.connection_type === 'supabase') {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port,
          password: decryptResult.decrypted_password,
          tls: {
            enabled: connection.ssl_enabled,
            enforce: false,
            caCertificates: []
          }
        });

        await client.connect();
        
        console.log('🔧 Executing SQL:', parameterizedSql);
        const result = await client.queryObject(parameterizedSql);
        const elapsedMs = Date.now() - startTime;
        
        await client.end();

        // Format response
        const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
        const rows = result.rows.map(row => Object.values(row));

        const queryResult = {
          columns,
          rows,
          total_rows: result.rows.length,
          truncated: result.rows.length >= Math.min(row_limit, 10000),
          elapsed_ms: elapsedMs
        };

        console.log(`✅ Query executed successfully. Rows: ${queryResult.rows.length}, Time: ${elapsedMs}ms`);

        // If mode is 'dataset', record usage
        if (mode === 'dataset') {
          // Record usage event
          await supabase.from('usage_tracking').insert({
            org_id: org_id,
            metric_name: 'sql_queries_executed',
            metric_value: 1
          });

          // Log in audit
          await supabase.functions.invoke('audit-log', {
            body: {
              org_id: org_id,
              user_id: user.id,
              action: 'sql_query_executed',
              resource_type: 'query',
              metadata: {
                connection_id: connection_id,
                mode: mode,
                row_count: queryResult.rows.length
              }
            }
          });
        }

        return new Response(JSON.stringify(queryResult), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ 
          error_code: 'UNSUPPORTED_CONNECTION_TYPE',
          message: `Connection type ${connection.connection_type} not supported for SQL queries` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (queryError) {
      return new Response(JSON.stringify({ 
        error_code: 'QUERY_EXECUTION_ERROR',
        message: `Query failed: ${queryError.message}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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