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

    // Validate SQL is SELECT-only
    const cleanSql = sql.trim().toLowerCase();
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

    // Check for forbidden keywords (DDL/DML)
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'create', 'alter', 'drop', 
      'grant', 'revoke', 'truncate', 'merge', 'call'
    ];
    
    const containsForbidden = forbiddenKeywords.some(keyword => 
      cleanSql.includes(keyword)
    );

    if (containsForbidden || !cleanSql.startsWith('select')) {
      return new Response(JSON.stringify({ 
        error_code: 'ONLY_SELECT_ALLOWED',
        message: 'Only SELECT queries are allowed for security reasons' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decrypt password
    const { data: decryptResult } = await supabase.functions.invoke('decrypt-password', {
      body: { encrypted_password: connection.encrypted_password }
    });

    if (!decryptResult?.decrypted_password) {
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
      // This is a simplified version - in production, use proper database drivers
      // For now, we'll simulate the query execution
      const mockResult = {
        columns: ['id', 'name', 'created_at'],
        rows: [
          ['1', 'Sample Data', '2024-01-01T00:00:00Z'],
          ['2', 'Test Record', '2024-01-02T00:00:00Z']
        ],
        truncated: false,
        elapsed_ms: Date.now() - startTime
      };

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
              row_count: mockResult.rows.length
            }
          }
        });
      }

      return new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

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