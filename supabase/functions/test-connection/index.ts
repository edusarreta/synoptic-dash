import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  connectionType: 'postgresql' | 'supabase' | 'rest_api';
  config: {
    host?: string;
    port?: number;
    database_name?: string;
    username?: string;
    password?: string;
    ssl_enabled?: boolean;
    supabase_url?: string;
    anon_key?: string;
    service_key?: string;
    base_url?: string;
    bearer_token?: string;
    api_key?: string;
    header_name?: string;
  };
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
        JSON.stringify({ error: 'Missing authorization header' }),
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
    const { connectionType, config }: TestConnectionRequest = await req.json();

    console.log(`🔧 Testing ${connectionType} connection for user ${user.id}`);

    let testResult = false;
    let errorMessage = '';

    try {
      if (connectionType === 'postgresql') {
        // Test PostgreSQL connection
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        console.log('🔧 Testing PostgreSQL connection...');
        
        const client = new Client({
          user: config.username,
          database: config.database_name,
          hostname: config.host,
          port: config.port || 5432,
          password: config.password,
          tls: config.ssl_enabled ? 'require' : 'disable',
        });

        try {
          await client.connect();
          console.log('✅ PostgreSQL connection successful');
          
          // Test with a simple query
          const result = await client.queryObject('SELECT 1 as test');
          testResult = result.rows.length > 0;
          
          await client.end();
        } catch (pgError) {
          console.error('❌ PostgreSQL connection failed:', pgError);
          errorMessage = pgError.message;
        }
        
      } else if (connectionType === 'supabase') {
        // Test Supabase connection
        console.log('🔧 Testing Supabase connection...');
        
        if (!config.supabase_url || !config.anon_key) {
          throw new Error('Supabase URL and Anon Key are required');
        }
        
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.56.1");
        
        const testClient = createClient(config.supabase_url, config.anon_key);
        
        try {
          // Test connection by getting database metadata
          const response = await fetch(`${config.supabase_url}/rest/v1/`, {
            headers: {
              'apikey': config.anon_key,
              'Authorization': `Bearer ${config.anon_key}`,
              'Accept': 'application/json'
            }
          });
          
          testResult = response.ok;
          if (!testResult) {
            errorMessage = `Supabase API error: ${response.status} ${response.statusText}`;
          } else {
            console.log('✅ Supabase connection successful');
          }
        } catch (supabaseError) {
          console.error('❌ Supabase connection failed:', supabaseError);
          errorMessage = supabaseError.message;
        }
        
      } else if (connectionType === 'rest_api') {
        // Test REST API connection
        console.log('🔧 Testing REST API connection...');
        
        if (!config.base_url) {
          throw new Error('Base URL is required for REST API');
        }
        
        try {
          const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };
          
          // Add authentication headers based on type
          if (config.bearer_token) {
            headers['Authorization'] = `Bearer ${config.bearer_token}`;
          } else if (config.api_key && config.header_name) {
            headers[config.header_name] = config.api_key;
          }
          
          const response = await fetch(config.base_url, {
            method: 'GET',
            headers
          });
          
          testResult = response.ok;
          if (!testResult) {
            errorMessage = `REST API error: ${response.status} ${response.statusText}`;
          } else {
            console.log('✅ REST API connection successful');
          }
        } catch (restError) {
          console.error('❌ REST API connection failed:', restError);
          errorMessage = restError.message;
        }
        
      } else {
        throw new Error(`Unsupported connection type: ${connectionType}`);
      }

    } catch (testError) {
      console.error('❌ Connection test failed:', testError);
      testResult = false;
      errorMessage = testError.message;
    }

    return new Response(
      JSON.stringify({
        success: testResult,
        message: testResult ? 'Connection successful' : 'Connection failed',
        error: testResult ? null : errorMessage
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});