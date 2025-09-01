import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import { getSupabaseApiConfig } from '../_shared/connections.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handleSqlPreview(config: any, schema: string, table: string, limit: number, offset: number) {
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

export async function handleSupabaseApiPreview(connection_id: string, org_id: string, schema: string, table: string, limit: number, offset: number) {
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