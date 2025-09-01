import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

interface TestConnectionRequest {
  org_id: string;
  connection_id?: string;
  type?: 'postgresql' | 'mysql';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl_mode?: string;
}

serve(async (req) => {
  console.log('🔧 test-database-connection function called');
  
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    const admin = adminClient();
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Token de autorização necessário', 401);
    }

    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('Token inválido', 401);
    }

    const body: TestConnectionRequest = await req.json();
    const { org_id, connection_id, type, host, port, database, user: dbUser, password, ssl_mode } = body;

    console.log('🔧 Request body parsed:', { 
      org_id, 
      connection_id: connection_id || 'inline', 
      type, 
      host, 
      port, 
      database, 
      user: dbUser, 
      ssl_mode 
    });

    // Validate membership
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return errorResponse('Você não tem acesso a esta organização', 403);
    }

    let connectionConfig: any = {};

    // If connection_id is provided, get connection from database
    if (connection_id) {
      console.log('🔧 Fetching connection from database:', connection_id);
      const { data: connection, error: connectionError } = await admin
        .from('data_connections')
        .select('*')
        .eq('id', connection_id)
        .eq('account_id', org_id)
        .single();

      if (connectionError || !connection) {
        return errorResponse('Conexão não encontrada', 404);
      }

      // Decrypt password
      console.log('🔧 Decrypting password...');
      const key = Deno.env.get('DB_ENCRYPTION_KEY');
      if (!key) {
        return errorResponse('Chave de criptografia não configurada', 500);
      }

      if (!connection.encrypted_password) {
        return errorResponse('Senha não encontrada na conexão', 500);
      }

      let decryptedPassword: string;
      try {
        // Use the robust decryption logic
        const decoded = atob(connection.encrypted_password);
        
        // Try different formats for backward compatibility
        if (decoded.includes('::')) {
          // Format: password::key_prefix
          const parts = decoded.split('::');
          if (parts.length === 2 && parts[1] === key.slice(0, 8)) {
            decryptedPassword = parts[0];
          } else {
            throw new Error('Invalid encrypted password format');
          }
        } else {
          // Direct decryption (assume the password is directly encoded)
          decryptedPassword = decoded;
        }
        
        console.log('🔓 Password decrypted successfully');
      } catch (decryptError) {
        console.error('❌ Password decryption failed:', decryptError);
        return errorResponse('Erro ao descriptografar senha da conexão', 500);
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
      connectionConfig = { type, host, port, database, user: dbUser, password, ssl_mode };
    }

    console.log('🔧 Final connection config:', { 
      type: connectionConfig.type, 
      host: connectionConfig.host, 
      port: connectionConfig.port, 
      database: connectionConfig.database, 
      user: connectionConfig.user,
      ssl_mode: connectionConfig.ssl_mode
    });

    // Validate required parameters
    if (!connectionConfig.host || !connectionConfig.database || !connectionConfig.user || !connectionConfig.password) {
      const missing = [];
      if (!connectionConfig.host) missing.push('host');
      if (!connectionConfig.database) missing.push('database'); 
      if (!connectionConfig.user) missing.push('user');
      if (!connectionConfig.password) missing.push('password');
      
      return errorResponse(`Parâmetros obrigatórios ausentes: ${missing.join(', ')}`, 400);
    }

    let testResult = false;
    let errorMessage = '';
    let serverVersion = '';

    try {
      if (connectionConfig.type === 'postgresql') {
        console.log('🔧 Testing PostgreSQL connection...');
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        // Sanitize password for SCRAM compatibility
        const sanitizedPassword = connectionConfig.password.replace(/[^\x00-\x7F]/g, "");
        if (sanitizedPassword !== connectionConfig.password) {
          console.warn('⚠️ Password contained non-ASCII characters, sanitized for SCRAM');
        }
        
        // Build connection config based on SSL mode
        const pgConfig: any = {
          user: connectionConfig.user,
          database: connectionConfig.database,
          hostname: connectionConfig.host,
          port: connectionConfig.port || 5432,
          password: sanitizedPassword,
          connection: {
            attempts: 3,
            interval: 1000
          }
        };

        // Configure SSL based on ssl_mode
        if (connectionConfig.ssl_mode === 'disable') {
          pgConfig.tls = { enabled: false };
        } else {
          pgConfig.tls = { 
            enabled: true, 
            enforce: false,
            caCertificates: []
          };
        }

        console.log('🔧 PostgreSQL config (SSL mode):', connectionConfig.ssl_mode);

        const client = new Client(pgConfig);
        
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), 8000);
        });

        const connectPromise = (async () => {
          await client.connect();
          const result = await client.queryObject('SELECT 1 as test');
          if (result.rows.length > 0) {
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
        console.log('✅ PostgreSQL connection successful');
        
      } else if (connectionConfig.type === 'mysql') {
        console.log('🔧 Testing MySQL connection...');
        const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
        
        const client = await new Client().connect({
          hostname: connectionConfig.host,
          port: connectionConfig.port || 3306,
          username: connectionConfig.user,
          password: connectionConfig.password,
          db: connectionConfig.database,
        });

        await client.execute('SELECT 1');
        await client.close();
        
        testResult = true;
        serverVersion = 'MySQL';
        console.log('✅ MySQL connection successful');
        
      } else {
        throw new Error(`Tipo de conexão não suportado: ${connectionConfig.type}`);
      }

    } catch (testError: any) {
      console.error('❌ Connection test failed:', testError.message);
      testResult = false;
      
      // Normalize error messages
      if (testError.message === 'TIMEOUT') {
        errorMessage = 'TIMEOUT';
      } else if (testError.message.includes('ECONNREFUSED')) {
        errorMessage = 'DNS_ERROR';
      } else if (testError.message.includes('ETIMEDOUT')) {
        errorMessage = 'TIMEOUT';
      } else if (testError.message.includes('SSL') || testError.message.includes('TLS')) {
        errorMessage = 'TLS_HANDSHAKE';
      } else if (testError.message.includes('authentication') || testError.message.includes('password')) {
        errorMessage = 'AUTH_FAILED';
      } else {
        errorMessage = testError.message || 'Erro desconhecido na conexão';
      }
    }

    return successResponse({
      ok: testResult,
      success: testResult,
      engine: connectionConfig.type,
      server_version: serverVersion,
      message: testResult ? 'Conexão bem-sucedida' : 'Falha na conexão',
      ...(errorMessage && { error_message: errorMessage })
    });

  } catch (error: any) {
    console.error('Function error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});