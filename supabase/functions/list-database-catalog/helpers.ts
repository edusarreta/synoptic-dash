import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import { getSupabaseApiConfig } from '../_shared/connections.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handleSqlCatalog(config: any) {
  console.log('🔌 DB Config prepared:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: config.ssl_mode === 'require'
  });

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
    console.log('🔗 PostgreSQL connected successfully');

    // Query to get schemas and tables with column info
    const result = await client.queryObject(`
      SELECT 
        t.table_schema,
        t.table_name,
        COUNT(c.column_name) as column_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'name', c.column_name,
            'type', c.data_type,
            'nullable', c.is_nullable = 'YES'
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_schema, t.table_name
      ORDER BY t.table_schema, t.table_name
    `);

    // Group by schema
    const schemas: any = {};
    for (const row of result.rows) {
      const schemaName = row.table_schema as string;
      if (!schemas[schemaName]) {
        schemas[schemaName] = {
          name: schemaName,
          tables: []
        };
      }
      schemas[schemaName].tables.push({
        name: row.table_name,
        column_count: row.column_count,
        columns: row.columns
      });
    }

    const catalogData = {
      db: config.database,
      schemas: Object.values(schemas)
    };

    return new Response(
      JSON.stringify(catalogData),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('💥 PostgreSQL connection failed:', error.message);
    console.error('💥 Database catalog error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Database connection failed', 
        message: error.message,
        error_code: 'CONNECTION_FAILED'
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

export async function handleSupabaseApiCatalog(connection_id: string, org_id: string) {
  try {
    const config = await getSupabaseApiConfig(connection_id, org_id);
    
    // Use Supabase pg_meta API to get schemas and tables
    const headers = {
      'apikey': config.supabase_key,
      'Authorization': `Bearer ${config.supabase_key}`,
      'Content-Type': 'application/json'
    };

    // Get schemas
    const schemasResponse = await fetch(`${config.supabase_url}/rest/v1/rpc/pg_meta_schemas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!schemasResponse.ok) {
      throw new Error('Failed to fetch schemas from Supabase API');
    }

    const schemasData = await schemasResponse.json();
    const filteredSchemas = schemasData.filter((schema: any) => 
      schema.name === config.schema_default || schema.name === 'public'
    );

    // Get tables for each schema
    const schemas = [];
    for (const schema of filteredSchemas) {
      const tablesResponse = await fetch(`${config.supabase_url}/rest/v1/rpc/pg_meta_tables`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ schema: schema.name })
      });

      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        
        const tables = [];
        for (const table of tablesData) {
          // Get columns for each table
          const columnsResponse = await fetch(`${config.supabase_url}/rest/v1/rpc/pg_meta_columns`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ schema: schema.name, table: table.name })
          });

          let columns = [];
          if (columnsResponse.ok) {
            columns = await columnsResponse.json();
          }

          tables.push({
            name: table.name,
            column_count: columns.length,
            columns: columns.map((col: any) => ({
              name: col.name,
              type: col.format,
              nullable: !col.is_required
            }))
          });
        }

        schemas.push({
          name: schema.name,
          tables
        });
      }
    }

    const catalogData = {
      db: 'supabase',
      schemas
    };

    return new Response(
      JSON.stringify(catalogData),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('💥 Supabase API catalog error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Supabase API connection failed', 
        message: error.message,
        error_code: 'SUPABASE_API_FAILED'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}