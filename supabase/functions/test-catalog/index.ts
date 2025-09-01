import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request) {
  console.log('🧪 Test catalog function called');
  
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
    const body = await req.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const { org_id, connection_id } = body;
    
    if (!org_id || !connection_id) {
      console.log('❌ Missing required params');
      return new Response(
        JSON.stringify({ error: 'org_id and connection_id are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to fetch the connection
    console.log('🔍 Fetching connection:', { org_id, connection_id });
    
    const { data: connection, error } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .single();

    console.log('📊 Connection query result:', {
      found: !!connection,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details
    });

    if (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Connection query failed', 
          message: error.message,
          code: error.code,
          details: error.details
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('✅ Connection found:', {
      name: connection.name,
      type: connection.connection_type,
      active: connection.is_active,
      host: connection.host,
      database: connection.database_name,
      hasEncryptedPassword: !!connection.encrypted_password
    });

    // Decrypt password if needed
    let password = connection.encrypted_password;
    if (password) {
      try {
        console.log('🔓 Attempting to decrypt password...');
        const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
          body: { encrypted_password: password }
        });
        
        if (decryptError) {
          console.log('⚠️ Decrypt error:', decryptError);
        } else if (decryptData?.password) {
          password = decryptData.password;
          console.log('✅ Password decrypted successfully');
        } else {
          console.log('⚠️ No decrypted password returned, using as-is');
        }
      } catch (decryptError: any) {
        console.warn('⚠️ Failed to decrypt password, using as-is:', decryptError.message);
      }
    }

    // Test connection with multiple approaches to handle SCRAM issues
    if (connection.connection_type === 'postgresql') {
      const connectionConfigs = [
        // Config 1: Basic connection without SSL
        {
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port || 5432,
          password: password,
          tls: { enabled: false }
        },
        // Config 2: With connection string (bypasses SCRAM validation)
        {
          connection: `postgresql://${encodeURIComponent(connection.username)}:${encodeURIComponent(password)}@${connection.host}:${connection.port || 5432}/${connection.database_name}?sslmode=disable`
        }
      ];

      let lastError: any = null;
      
      for (let i = 0; i < connectionConfigs.length; i++) {
        try {
          console.log(`🔄 Trying connection config ${i + 1}/${connectionConfigs.length}`);
          const client = new Client(connectionConfigs[i]);
          
          await client.connect();
          console.log('🔗 PostgreSQL test connection successful');
          
          // Simple test query
          const result = await client.queryObject('SELECT version()');
          console.log('📝 Test query result:', result.rows[0]);
          
          await client.end();

          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Connection test successful',
              connection: {
                name: connection.name,
                type: connection.connection_type,
                database: connection.database_name,
                config_used: i + 1
              },
              test_result: result.rows[0]
            }),
            { status: 200, headers: corsHeaders }
          );

        } catch (error: any) {
          lastError = error;
          console.log(`❌ Config ${i + 1} failed:`, error.message);
          
          if (client) {
            try {
              await client.end();
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      }

      // If all configs failed
      console.error('💥 All connection configs failed. Last error:', lastError?.message);
      
      return new Response(
        JSON.stringify({ 
          error: 'Database connection test failed',
          message: lastError?.message || 'All connection attempts failed',
          connection_info: {
            host: connection.host,
            port: connection.port,
            database: connection.database_name,
            user: connection.username,
            username_length: connection.username?.length,
            has_special_chars: /[^\x00-\x7F]/.test(connection.username || '') || /[^\x00-\x7F]/.test(password || '')
          }
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Connection found but no test performed',
        connection: {
          name: connection.name,
          type: connection.connection_type
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('💥 Test function error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Test function failed', 
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

serve(handler);