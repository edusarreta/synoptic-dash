import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import { assertMembershipAndPerm, getSqlConnectionConfig } from '../_shared/connections.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error_code: 'METHOD_NOT_ALLOWED', message: 'Apenas POST permitido' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { org_id, connection_id, sql, params = {}, row_limit = 1000, timeout_ms = 15000 } = await req.json();

    if (!org_id || !connection_id || !sql) {
      return new Response(
        JSON.stringify({ error_code: 'MISSING_PARAMS', message: 'org_id, connection_id e sql são obrigatórios' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate permissions
    const permError = await assertMembershipAndPerm(req, org_id, 'sql:run');
    if (permError) return permError;

    // Get connection config
    const config = await getSqlConnectionConfig(connection_id, org_id);

    // Check if connection type is supported (SQL only)
    if (config.connection_type === 'supabase_api' || config.connection_type === 'rest') {
      return new Response(
        JSON.stringify({ error_code: 'UNSUPPORTED_FOR_CONNECTION', message: 'SQL Editor suporta apenas conexões SQL' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate SELECT-only (more permissive)
    const sqlTrimmed = sql.trim().toLowerCase();
    
    // Check for multiple statements
    const statements = sqlTrimmed.split(';').filter(s => s.trim());
    if (statements.length > 1) {
      return new Response(
        JSON.stringify({ error_code: 'MULTIPLE_STATEMENTS', message: 'Múltiplos statements não permitidos' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for forbidden operations
    const forbiddenPattern = /\b(insert|update|delete|create|alter|drop|grant|revoke|truncate|merge|call|execute)\b/i;
    if (forbiddenPattern.test(sqlTrimmed)) {
      return new Response(
        JSON.stringify({ error_code: 'FORBIDDEN_OPERATION', message: 'Apenas consultas SELECT são permitidas' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Process named parameters
    let processedSql = sql;
    for (const [paramName, paramValue] of Object.entries(params)) {
      const paramRegex = new RegExp(`:${paramName}\\b`, 'g');
      const escapedValue = typeof paramValue === 'string' 
        ? `'${paramValue.replace(/'/g, "''")}'` 
        : String(paramValue);
      processedSql = processedSql.replace(paramRegex, escapedValue);
    }

    // Create PostgreSQL client
    const client = new Client({
      user: config.user,
      database: config.database,
      hostname: config.host,
      port: config.port,
      password: config.password,
      tls: config.ssl_mode === 'require' ? {
        enabled: true,
        enforce: false,
        caCertificates: []
      } : undefined
    });

    const startTime = Date.now();

    try {
      await client.connect();

      // Add LIMIT if not present
      if (!sqlTrimmed.includes(' limit ')) {
        processedSql += ` LIMIT ${Math.min(row_limit, 10000)}`;
      }

      const result = await client.queryObject(processedSql);
      const elapsedMs = Date.now() - startTime;

      // Format results
      const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
      const rows = result.rows.map(row => Object.values(row));

      return new Response(
        JSON.stringify({
          columns,
          rows,
          truncated: result.rows.length >= Math.min(row_limit, 10000),
          elapsed_ms: elapsedMs
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch (queryError: any) {
      return new Response(
        JSON.stringify({ 
          error_code: 'QUERY_EXECUTION_ERROR', 
          message: `Erro na consulta: ${queryError.message}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.warn('Warning closing DB connection:', closeError);
      }
    }

  } catch (error: any) {
    console.error('SQL query error:', error);
    return new Response(
      JSON.stringify({ 
        error_code: 'INTERNAL_ERROR', 
        message: 'Erro interno do servidor' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Main handler
serve(handler);