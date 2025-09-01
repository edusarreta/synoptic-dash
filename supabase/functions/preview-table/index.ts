import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import { assertMembershipAndPerm, getSqlConnectionConfig, getSupabaseApiConfig } from '../_shared/connections.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function handleSqlPreview(config: any, schema: string, table: string, limit: number, offset: number) {
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
    } : {
      enabled: false
    }
  });

  try {
    await client.connect();

    // Escape schema and table names to prevent SQL injection
    const escapedSchema = schema.replace(/"/g, '""');
    const escapedTable = table.replace(/"/g, '""');
    
    const query = `SELECT * FROM "${escapedSchema}"."${escapedTable}" LIMIT $1 OFFSET $2`;
    const result = await client.queryObject(query, [limit, offset]);

    // Get column information
    const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
    const rows = result.rows.map(row => columns.map(col => row[col]));

    return new Response(
      JSON.stringify({
        success: true,
        columns,
        rows,
        truncated: result.rows.length === limit
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Preview error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to preview table',
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    try {
      await client.end();
    } catch (closeError) {
      console.warn('Warning closing DB connection:', closeError);
    }
  }
}

async function handleSupabaseApiPreview(connection_id: string, org_id: string, schema: string, table: string, limit: number, offset: number) {
  try {
    const config = await getSupabaseApiConfig(connection_id, org_id);
    
    // Use PostgREST API to query the table
    const headers = {
      'apikey': config.supabase_key,
      'Authorization': `Bearer ${config.supabase_key}`,
      'Accept-Profile': schema
    };

    const url = `${config.supabase_url}/rest/v1/${table}?select=*&limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Derive columns from first row if data exists
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const rows = data.map((row: any) => columns.map(col => row[col]));

    return new Response(
      JSON.stringify({
        success: true,
        columns,
        rows,
        truncated: data.length === limit
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Supabase API preview error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to preview table via Supabase API',
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { org_id, connection_id, schema, table, limit = 100, offset = 0 } = await req.json();
    
    if (!org_id || !connection_id || !schema || !table) {
      return new Response(
        JSON.stringify({ error: 'org_id, connection_id, schema, and table are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate permissions
    const permError = await assertMembershipAndPerm(req, org_id, 'catalog:read');
    if (permError) return permError;

    // Get connection config
    const config = await getSqlConnectionConfig(connection_id, org_id);
    
    // Check connection type and handle accordingly
    if (config.connection_type === 'supabase_api') {
      return await handleSupabaseApiPreview(connection_id, org_id, schema, table, limit, offset);
    } else {
      return await handleSqlPreview(config, schema, table, limit, offset);
    }

  } catch (error: any) {
    console.error('Preview error:', error);
    return new Response(
      JSON.stringify({
        error: 'Table preview failed',
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Main handler
serve(handler);