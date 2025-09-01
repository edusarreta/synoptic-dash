import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  org_id: string;
  type: 'postgresql' | 'mysql' | 'supabase_api';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_mode?: string;
}

serve(async (req) => {
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

    const { org_id, type, host, port, database, user: dbUser, password, ssl_mode }: TestConnectionRequest = await req.json();

    console.log(`🔧 Testing ${type} connection for user ${user.id} in org ${org_id}`);

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

    try {
      if (type === 'postgresql') {
        console.log('🔧 Testing PostgreSQL connection...');
        
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        // Try connection with SSL settings
        const client = new Client({
          user: dbUser,
          database: database,
          hostname: host,
          port: port,
          password: password,
          tls: ssl_mode === 'require' ? { enabled: true, enforce: false } : false,
        });

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
        
      } else if (type === 'mysql') {
        // MySQL implementation with proper error handling
        try {
          const { Client } = await import("https://deno.land/x/mysql@v2.12.1/mod.ts");
          
          const client = await new Client().connect({
            hostname: host,
            port: port,
            username: dbUser,
            password: password,
            db: database,
          });

          // Test with simple query
          await client.execute('SELECT 1');
          await client.close();
          
          testResult = true;
          serverVersion = 'MySQL';
        } catch (mysqlError: any) {
          console.error('❌ MySQL connection failed:', mysqlError.message);
          errorMessage = mysqlError.message;
          testResult = false;
        }
        
      } else if (type === 'supabase_api') {
        return new Response(
          JSON.stringify({ ok: false, message: 'Supabase API não suporta teste direto' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } else {
        throw new Error(`Tipo de conexão não suportado: ${type}`);
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
        engine: type,
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