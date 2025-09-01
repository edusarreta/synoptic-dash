import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  org_id: string;
  connection_id?: string;
  type?: 'postgresql' | 'mysql' | 'supabase_api';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl_mode?: string;
}

serve(async (req) => {
  console.log('🔧 test-database-connection function called');
  console.log('Method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { org_id, connection_id, type, host, port, database, user: dbUser, password, ssl_mode }: TestConnectionRequest = await req.json();

    console.log('🔧 Request body parsed:', { org_id, connection_id, type, host, port, database, user: dbUser, password: password ? '[REDACTED]' : 'none', ssl_mode });
    console.log(`🔧 Testing connection for user ${user.id} in org ${org_id}`);

    // Validate membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Você não tem acesso a esta organização' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let testResult = false;
    let errorMessage = '';
    let serverVersion = '';
    let connectionConfig: any = {};

    // If connection_id is provided, get connection from database
    if (connection_id) {
      console.log('🔧 Fetching connection from database:', connection_id);
      const { data: connection, error: connectionError } = await supabase
        .from('data_connections')
        .select('*')
        .eq('id', connection_id)
        .eq('account_id', org_id)
        .single();

      console.log('🔧 Connection data:', connection ? 'found' : 'not found', 'Error:', connectionError);

      if (connectionError || !connection) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Conexão não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decrypt password directly
      console.log('🔧 Decrypting password...');
      
      const decryptPassword = (encryptedPassword: string): string => {
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
          throw new Error('Failed to decrypt password');
        }
      };

      let decryptedPassword: string;
      try {
        decryptedPassword = decryptPassword(connection.encrypted_password);
        console.log('🔧 Password decryption successful');
      } catch (decryptError) {
        console.error('❌ Password decryption failed:', decryptError);
        return new Response(
          JSON.stringify({ ok: false, success: false, message: 'Erro ao descriptografar senha' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      connectionConfig = {
        type: connection.connection_type,
        host: connection.host,
        port: connection.port,
        database: connection.database_name,
        user: connection.username,
        password: decryptedPassword,
        ssl_mode: connection.connection_config?.ssl_mode || 'require'
      };
    } else {
      // Use provided parameters for new connection test
      connectionConfig = {
        type,
        host,
        port,
        database,
        user: dbUser,
        password,
        ssl_mode
      };
    }

    console.log('🔧 Final connection config:', { 
      type: connectionConfig.type, 
      host: connectionConfig.host, 
      port: connectionConfig.port, 
      database: connectionConfig.database, 
      user: connectionConfig.user 
    });

    try {
      if (connectionConfig.type === 'postgresql') {
        console.log('🔧 Testing PostgreSQL connection...');
        
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        // Try multiple connection approaches to handle SCRAM issues
        const connectionConfigs = [
          // 1. Standard connection with SSL
          {
            user: connectionConfig.user,
            database: connectionConfig.database,
            hostname: connectionConfig.host,
            port: connectionConfig.port || 5432,
            password: connectionConfig.password,
            tls: { enabled: true, enforce: false }
          },
          // 2. Connection string format to bypass SCRAM issues
          {
            connectionString: `postgresql://${encodeURIComponent(connectionConfig.user)}:${encodeURIComponent(connectionConfig.password)}@${connectionConfig.host}:${connectionConfig.port || 5432}/${connectionConfig.database}?sslmode=require`,
          },
          // 3. Without SSL for local connections
          {
            user: connectionConfig.user,
            database: connectionConfig.database,
            hostname: connectionConfig.host,
            port: connectionConfig.port || 5432,
            password: connectionConfig.password,
            tls: { enabled: false }
          }
        ];

        let lastError = null;

        for (const config of connectionConfigs) {
          try {
            const client = new Client(config);
            
            // Set timeout to 8 seconds
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('TIMEOUT')), 8000);
            });

            const connectPromise = (async () => {
              await client.connect();
              
              // Test with simple query
              const result = await client.queryObject('SELECT 1 as test');
              if (result.rows.length > 0) {
                // Get server version
                const versionResult = await client.queryObject('SELECT version() as version');
                if (versionResult.rows.length > 0) {
                  const versionString = (versionResult.rows[0] as any).version;
                  serverVersion = versionString.split(' ')[1] || 'Unknown';
                }
              }
              
              await client.end();
              return true;
            })();

            testResult = await Promise.race([connectPromise, timeoutPromise]) as boolean;
            
            if (testResult) {
              console.log('✅ PostgreSQL connection successful');
              break; // Success, exit loop
            }
          } catch (pgError) {
            console.error('❌ PostgreSQL connection attempt failed:', pgError.message);
            lastError = pgError;
            continue; // Try next config
          }
        }
        
        if (!testResult && lastError) {
          errorMessage = lastError.message;
        }
        
      } else if (connectionConfig.type === 'mysql') {
        // MySQL implementation with proper error handling
        console.log('🔧 Testing MySQL connection...');
        
        try {
          const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
          
          const client = await new Client().connect({
            hostname: connectionConfig.host,
            port: connectionConfig.port || 3306,
            username: connectionConfig.user,
            password: connectionConfig.password,
            db: connectionConfig.database,
          });

          // Test with simple query
          await client.execute('SELECT 1');
          await client.close();
          
          testResult = true;
          serverVersion = 'MySQL';
          console.log('✅ MySQL connection successful');
        } catch (mysqlError: any) {
          console.error('❌ MySQL connection failed:', mysqlError.message);
          errorMessage = mysqlError.message;
          testResult = false;
        }
        
      } else if (connectionConfig.type === 'supabase_api') {
        return new Response(
          JSON.stringify({ ok: false, message: 'Supabase API não suporta teste direto' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } else {
        throw new Error(`Tipo de conexão não suportado: ${connectionConfig.type}`);
      }

    } catch (testError: any) {
      console.error('❌ Connection test failed:', testError.message);
      testResult = false;
      
      // Provide user-friendly error messages
      if (testError.message === 'TIMEOUT') {
        errorMessage = 'Timeout: Banco inacessível (verifique host/porta/firewall)';
      } else if (testError.message.includes('ECONNREFUSED')) {
        errorMessage = 'Banco inacessível (host/porta/firewall)';
      } else if (testError.message.includes('ETIMEDOUT')) {
        errorMessage = 'Timeout de conexão (verifique host/porta/firewall)';
      } else if (testError.message.includes('SSL') || testError.message.includes('TLS')) {
        errorMessage = 'Erro SSL/TLS: Verifique configuração SSL';
      } else if (testError.message.includes('authentication') || testError.message.includes('password')) {
        errorMessage = 'Falha na autenticação (usuário/senha incorretos)';
      } else if (testError.message.includes('scram')) {
        errorMessage = 'Erro SCRAM: Verifique usuário/senha ou use SSL';
      } else {
        errorMessage = testError.message || 'Erro desconhecido na conexão';
      }
    }

    return new Response(
      JSON.stringify({
        ok: testResult,
        success: testResult,
        engine: connectionConfig.type,
        server_version: serverVersion,
        message: testResult ? 'Conexão bem-sucedida' : 'Falha na conexão',
        error_message: testResult ? null : errorMessage
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        message: 'Erro interno do servidor', 
        error_message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})