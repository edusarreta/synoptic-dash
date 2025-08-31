import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ListCatalogRequest {
  org_id: string;
  connection_id: string;
  schema_name?: string;
  table_name?: string;
  preview_limit?: number;
}

// Internal function for decrypting passwords
function decryptPassword(encryptedPassword: string): string {
  try {
    const encryptionKey = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Simple decryption matching the encryption function
    const decoded = atob(encryptedPassword);
    const parts = decoded.split('::');
    
    if (parts.length !== 2 || parts[1] !== encryptionKey.slice(0, 8)) {
      throw new Error('Invalid encrypted password format');
    }

    return parts[0];
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
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
      connection_id, 
      schema_name, 
      table_name, 
      preview_limit = 100 
    }: ListCatalogRequest = await req.json();

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
        JSON.stringify({ error_code: 'CONNECTION_NOT_FOUND', message: 'Conexão não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📋 Listing catalog for connection ${connection_id} in org ${org_id}`);

    try {
      if (connection.connection_type === 'postgresql' || connection.connection_type === 'supabase') {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        // Decrypt password using internal function
        const decryptedPassword = decryptPassword(connection.encrypted_password);
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port || 5432,
          password: decryptedPassword,
          tls: {
            enabled: connection.ssl_enabled,
            enforce: false,
            caCertificates: []
          }
        });

        await client.connect();

        let result: any;

        if (table_name && schema_name) {
          // Get table columns and preview data
          const columnsQuery = `
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default,
              ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `;
          
          const previewQuery = `SELECT * FROM "${schema_name}"."${table_name}" LIMIT ${preview_limit}`;
          
          const [columnsResult, previewResult] = await Promise.all([
            client.queryObject(columnsQuery, [schema_name, table_name]),
            client.queryObject(previewQuery)
          ]);
          
          result = {
            type: 'table_details',
            schema_name,
            table_name,
            columns: columnsResult.rows,
            preview_data: {
              columns: previewResult.columns || [],
              rows: previewResult.rows || []
            }
          };

        } else if (schema_name) {
          // Get tables in schema
          const tablesQuery = `
            SELECT 
              table_name,
              table_type
            FROM information_schema.tables 
            WHERE table_schema = $1
            ORDER BY table_name
          `;
          
          const tablesResult = await client.queryObject(tablesQuery, [schema_name]);
          
          result = {
            type: 'schema_tables',
            schema_name,
            tables: tablesResult.rows
          };

        } else {
          // Get all schemas
          const schemasQuery = `
            SELECT 
              schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name
          `;
          
          const schemasResult = await client.queryObject(schemasQuery);
          
          result = {
            type: 'schemas',
            schemas: schemasResult.rows
          };
        }

        await client.end();

        return new Response(
          JSON.stringify(result),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } else {
        throw new Error(`Tipo de conexão não suportado: ${connection.connection_type}`);
      }

    } catch (catalogError: any) {
      console.error('❌ Catalog listing failed:', catalogError);
      
      return new Response(
        JSON.stringify({ 
          error_code: 'CATALOG_ERROR',
          message: 'Erro ao listar catálogo do banco',
          error_message: catalogError.message
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