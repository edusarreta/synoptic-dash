import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExecuteQueryRequest {
  connectionId: string;
  sqlQuery: string;
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
    const { connectionId, sqlQuery }: ExecuteQueryRequest = await req.json();

    if (!connectionId || !sqlQuery) {
      return new Response(
        JSON.stringify({ error: 'Missing connectionId or sqlQuery' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that it's a SELECT query only for security
    const trimmedQuery = sqlQuery.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return new Response(
        JSON.stringify({ error: 'Only SELECT queries are allowed' }),
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

    // Execute the SQL query
    try {
      let queryResult;
      
      if (connection.connection_type === 'postgresql') {
        // Create PostgreSQL connection
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        console.log('Connecting to PostgreSQL database...');
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port,
          password: connection.encrypted_password, // In production, this should be decrypted
          tls: connection.ssl_enabled ? 'require' : 'disable',
        });

        try {
          await client.connect();
          console.log('Connected to database, executing query...');
          
          // Execute the query with a timeout
          const result = await Promise.race([
            client.queryObject(sqlQuery),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000))
          ]);
          
          queryResult = result;
          console.log(`Query completed, found ${result.rowCount} rows`);
          
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

      console.log(`Query executed successfully for user ${user.id}, connection ${connectionId}`);
      
      // Get column names from the first row if available
      const columns = queryResult.rows && queryResult.rows.length > 0 
        ? Object.keys(queryResult.rows[0]) 
        : [];
      
      return new Response(
        JSON.stringify({
          success: true,
          data: queryResult.rows || [],
          rowCount: queryResult.rowCount || 0,
          columns: columns
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (queryError) {
      console.error('Query execution error:', queryError);
      
      // Return more detailed error information
      let errorMessage = 'Query execution failed';
      let errorDetails = queryError.message;
      
      if (queryError.message.includes('ECONNREFUSED')) {
        errorMessage = 'Database connection refused';
        errorDetails = 'Could not connect to the database. Check host and port.';
      } else if (queryError.message.includes('authentication failed')) {
        errorMessage = 'Authentication failed';
        errorDetails = 'Invalid username or password.';
      } else if (queryError.message.includes('does not exist')) {
        errorMessage = 'Database or table not found';
        errorDetails = queryError.message;
      } else if (queryError.message.includes('syntax error')) {
        errorMessage = 'SQL syntax error';
        errorDetails = queryError.message;
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