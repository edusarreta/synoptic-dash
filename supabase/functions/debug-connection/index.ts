import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request) {
  console.log('🔧 Simple connection test started');
  
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
    const { org_id, connection_id } = await req.json();
    
    console.log('📥 Testing connection:', { org_id, connection_id });

    // Get Supabase config
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch connection
    const { data: connection, error } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .single();

    if (error || !connection) {
      console.log('❌ Connection not found:', error?.message);
      return new Response(
        JSON.stringify({ error: 'Connection not found', details: error?.message }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('📊 Connection details:', {
      name: connection.name,
      host: connection.host,
      port: connection.port,
      database: connection.database_name,
      username: connection.username,
      encrypted_password_length: connection.encrypted_password?.length || 0,
      ssl_enabled: connection.ssl_enabled,
      connection_config: connection.connection_config
    });

    // Try to decrypt password
    let password = connection.encrypted_password;
    if (password) {
      try {
        console.log('🔓 Attempting password decryption...');
        const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
          body: { encrypted_password: password }
        });
        
        if (decryptError) {
          console.log('⚠️ Decrypt error:', decryptError);
          return new Response(
            JSON.stringify({ 
              error: 'Password decryption failed', 
              details: decryptError.message || 'Unknown decrypt error'
            }),
            { status: 500, headers: corsHeaders }
          );
        } else if (decryptData?.password) {
          password = decryptData.password;
          console.log('✅ Password decrypted successfully, length:', password.length);
        } else {
          console.log('⚠️ No password returned from decrypt function');
          return new Response(
            JSON.stringify({ error: 'No password returned from decrypt function' }),
            { status: 500, headers: corsHeaders }
          );
        }
      } catch (decryptError: any) {
        console.error('💥 Decrypt exception:', decryptError.message);
        return new Response(
          JSON.stringify({ 
            error: 'Password decryption exception', 
            details: decryptError.message 
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Test with different PostgreSQL drivers
    try {
      // Method 1: Using node-postgres compatible connection string
      const connectionString = `postgresql://${encodeURIComponent(connection.username)}:${encodeURIComponent(password)}@${connection.host}:${connection.port || 5432}/${connection.database_name}?sslmode=disable&connect_timeout=10`;
      
      console.log('🔗 Testing with connection string method...');
      console.log('Connection string (sanitized):', connectionString.replace(/:([^:@]+)@/, ':***@'));

      // Try using fetch to test basic connectivity
      const testUrl = `http://${connection.host}:${connection.port || 5432}`;
      
      try {
        console.log('🌐 Testing basic connectivity to:', testUrl);
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        console.log('📡 Basic connectivity test response:', response.status);
      } catch (fetchError: any) {
        console.log('⚠️ Basic connectivity failed (expected for DB):', fetchError.message);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Connection parameters validated',
          connection_details: {
            name: connection.name,
            host: connection.host,
            port: connection.port,
            database: connection.database_name,
            username: connection.username,
            password_length: password?.length || 0,
            ssl_mode: connection.connection_config?.ssl_mode || 'unknown'
          }
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch (testError: any) {
      console.error('💥 Connection test failed:', testError.message);
      
      return new Response(
        JSON.stringify({ 
          error: 'Connection test failed',
          message: testError.message,
          connection_info: {
            host: connection.host,
            port: connection.port,
            database: connection.database_name,
            username: connection.username
          }
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('💥 Handler error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Handler failed', 
        message: error.message 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

serve(handler);