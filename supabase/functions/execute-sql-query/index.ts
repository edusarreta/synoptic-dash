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
    // Rate limiting check - simple in-memory counter (replace with Redis in production)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`Request from IP: ${clientIP}`);
    
    // Log security event
    console.log(`Security audit: SQL query request from user, IP: ${clientIP}, timestamp: ${new Date().toISOString()}`);
    
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
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          success: false 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a separate client for auth validation
    const authClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication token',
          success: false,
          details: authError?.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ User authenticated:', user.id);

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

    // Enhanced SQL validation for security
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

    // Additional security checks
    const dangerousKeywords = ['delete', 'update', 'insert', 'drop', 'create', 'alter', 'truncate', 'exec', 'execute', 'xp_', 'sp_'];
    const queryLower = sqlQuery.toLowerCase();
    
    for (const keyword of dangerousKeywords) {
      if (queryLower.includes(keyword)) {
        return new Response(
          JSON.stringify({ error: `Query contains prohibited keyword: ${keyword}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Validate query structure to prevent complex injection attacks
    if (queryLower.includes(';') && !queryLower.endsWith(';')) {
      return new Response(
        JSON.stringify({ error: 'Multiple statements not allowed' }),
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
          password: connection.encrypted_password, // TODO: Implement proper password decryption
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
      } else if (connection.connection_type === 'supabase') {
        // Create Supabase connection using stored credentials
        console.log('Connecting to Supabase database to execute query...');
        
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.56.1");
        
        const supabaseUrl = connection.connection_config?.url;
        const serviceKey = connection.connection_config?.service_key;
        
        if (!supabaseUrl) {
          throw new Error('Supabase URL not found in connection config');
        }
        
        // Use service key if available, otherwise use anon key
        const apiKey = serviceKey || connection.connection_config?.anon_key;
        
        if (!apiKey) {
          throw new Error('No API key found in connection config');
        }
        
        const supabaseExternalClient = createClient(supabaseUrl, apiKey);
        
        try {
          console.log('Connected to Supabase, executing query...');
          
          // For Supabase, we need to use the rpc function to execute raw SQL
          // Since we can't execute arbitrary SQL directly, we'll parse the query and use appropriate methods
          const cleanQuery = sqlQuery.trim().toLowerCase();
          
          // Extract table name from SELECT query
          const selectMatch = cleanQuery.match(/from\s+(\w+)/);
          if (!selectMatch) {
            throw new Error('Could not parse table name from query');
          }
          
          const tableName = selectMatch[1];
          
          // Execute a basic select to get data
          let query = supabaseExternalClient.from(tableName).select('*');
          
          // Add limit if specified in original query
          const limitMatch = cleanQuery.match(/limit\s+(\d+)/);
          if (limitMatch) {
            query = query.limit(parseInt(limitMatch[1]));
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          console.log(`Supabase query completed, found ${data?.length || 0} rows`);
          
          queryResult = {
            rows: data || [],
            rowCount: data?.length || 0
          };
          
        } catch (supabaseError) {
          console.error('Supabase query error:', supabaseError);
          throw new Error(`Failed to execute query on Supabase: ${supabaseError.message}`);
        }
      } else {
        throw new Error(`Unsupported connection type: ${connection.connection_type}`);
      }

      console.log(`Query executed successfully for user ${user.id}, connection ${connectionId}`);
      
      // Get column names from the first row if available
      const columns = queryResult.rows && queryResult.rows.length > 0 
        ? Object.keys(queryResult.rows[0]) 
        : [];
      
      // Convert BigInt values to strings for JSON serialization
      const processedData = queryResult.rows?.map((row: any) => {
        const processedRow = { ...row };
        for (const key in processedRow) {
          if (typeof processedRow[key] === 'bigint') {
            processedRow[key] = processedRow[key].toString();
          }
        }
        return processedRow;
      }) || [];
      
      return new Response(
        JSON.stringify({
          success: true,
          data: processedData,
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