import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  connection_id: string;
}

async function decryptPassword(encryptedPassword: string): Promise<string> {
  const key = Deno.env.get('DB_ENCRYPTION_KEY') || 'demo-key-change-in-production';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  
  try {
    const encrypted = new Uint8Array(atob(encryptedPassword).split('').map(c => c.charCodeAt(0)));
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyData[i % keyData.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Password decryption failed:', error);
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
    const { connection_id }: TestConnectionRequest = await req.json();

    console.log(`🔧 Testing connection ${connection_id} for user ${user.id}`);

    // Get connection details
    const { data: connection, error: connectionError } = await supabaseClient
      .from('data_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Connection not found or inactive'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decrypt password
    const password = await decryptPassword(connection.encrypted_password);

    let testResult = false;
    let errorMessage = '';
    let serverVersion = '';

    try {
      if (connection.connection_type === 'postgresql' || connection.connection_type === 'supabase') {
        // Test PostgreSQL connection
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        console.log('🔧 Testing PostgreSQL connection...');
        
        const client = new Client({
          user: connection.username,
          database: connection.database_name,
          hostname: connection.host,
          port: connection.port || 5432,
          password: password,
          tls: {
            enabled: connection.ssl_enabled,
            enforce: false,
            caCertificates: []
          }
        });

        try {
          await client.connect();
          console.log('✅ PostgreSQL connection successful');
          
          // Get server version
          const versionResult = await client.queryObject('SELECT version()');
          if (versionResult.rows.length > 0) {
            serverVersion = (versionResult.rows[0] as any).version;
          }
          
          testResult = true;
          await client.end();
        } catch (pgError) {
          console.error('❌ PostgreSQL connection failed:', pgError);
          errorMessage = pgError.message;
        }
        
      } else {
        throw new Error(`Unsupported connection type: ${connection.connection_type}`);
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
        error: testResult ? null : errorMessage,
        server_version: serverVersion
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