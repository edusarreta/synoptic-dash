import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetSchemaRequest {
  connectionId: string;
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
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { connectionId }: GetSchemaRequest = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the user's profile to check account_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the data connection details
    const { data: connection, error: connectionError } = await supabaseClient
      .from('data_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('account_id', profile.account_id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Data connection not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get database schema
    try {
      let schemaResult;
      
      if (connection.connection_type === 'postgresql') {
        // Create PostgreSQL connection
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        console.log('Connecting to PostgreSQL database to get schema...');
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port,
          password: connection.encrypted_password,
          tls: connection.ssl_enabled ? 'require' : 'disable',
        });

        try {
          await client.connect();
          console.log('Connected to database, fetching schema...');
          
          // Get tables and their columns
          const tablesQuery = `
            SELECT 
              t.table_name,
              t.table_type,
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              c.ordinal_position
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
              AND t.table_type IN ('BASE TABLE', 'VIEW')
            ORDER BY t.table_name, c.ordinal_position
          `;
          
          const result = await client.queryObject(tablesQuery);
          
          // Process results into a structured format
          const tablesMap = new Map();
          
          for (const row of result.rows) {
            const tableName = row.table_name as string;
            const tableType = row.table_type as string;
            
            if (!tablesMap.has(tableName)) {
              tablesMap.set(tableName, {
                name: tableName,
                type: tableType,
                columns: []
              });
            }
            
            if (row.column_name) {
              tablesMap.get(tableName).columns.push({
                name: row.column_name as string,
                dataType: row.data_type as string,
                isNullable: row.is_nullable === 'YES',
                defaultValue: row.column_default,
                position: row.ordinal_position as number
              });
            }
          }
          
          schemaResult = Array.from(tablesMap.values());
          console.log(`Schema fetched successfully, found ${schemaResult.length} tables`);
          
        } finally {
          try {
            await client.end();
            console.log('Database connection closed');
          } catch (closeError) {
            console.error('Error closing connection:', closeError);
          }
        }
      } else {
        throw new Error(`Unsupported connection type: ${connection.connection_type}`);
      }

      console.log(`Schema retrieved successfully for user ${user.id}, connection ${connectionId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          tables: schemaResult,
          databaseName: connection.database_name
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (schemaError) {
      console.error('Schema fetch error:', schemaError);
      
      let errorMessage = 'Failed to fetch database schema';
      let errorDetails = schemaError.message;
      
      if (schemaError.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database connection refused';
        errorDetails = 'Could not connect to the database. Check host and port.';
      } else if (schemaError.message.includes('authentication failed')) {
        errorMessage = 'Authentication failed';
        errorDetails = 'Invalid username or password.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage, 
          details: errorDetails,
          success: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});