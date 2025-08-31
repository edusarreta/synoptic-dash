import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"
import { Database } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  org_id: string;
  workspace_id?: string;
  type: 'postgres' | 'postgresql' | 'supabase' | 'mysql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_mode: 'require' | 'disable';
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
        JSON.stringify({ ok: false, error_code: 'AUTH_REQUIRED', message: 'Token de autorização necessário' }),
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
        JSON.stringify({ ok: false, error_code: 'AUTH_INVALID', message: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { org_id, workspace_id, type, host, port, database, user: dbUser, password, ssl_mode }: TestConnectionRequest = await req.json();

    console.log(`🔧 Testing ${type} connection for user ${user.id} in org ${org_id}`);

    // Validate membership (user belongs to org)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ ok: false, error_code: 'ORG_ACCESS_DENIED', message: 'Você não tem acesso a esta organização' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let testResult = false;
    let errorMessage = '';
    let serverVersion = '';

    try {
      // Normalize connection type
      const normalizedType = type === 'postgresql' || type === 'supabase' ? 'postgres' : type;
      
      if (normalizedType === 'postgres') {
        // Test PostgreSQL connection
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        
        console.log('🔧 Testing PostgreSQL connection...');
        
        const client = new Client({
          user: dbUser,
          database: database,
          hostname: host,
          port: port,
          password: password,
          tls: ssl_mode === 'require' ? { enabled: true, enforce: false } : 'disable',
        });

        // Set timeout to 10 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), 10000);
        });

        const connectPromise = (async () => {
          await client.connect();
          console.log('✅ PostgreSQL connection successful');
          
          // Get server version
          const result = await client.queryObject('SELECT version() as version');
          if (result.rows.length > 0) {
            const versionString = (result.rows[0] as any).version;
            serverVersion = versionString.split(' ')[1] || 'Unknown';
          }
          
          await client.end();
          return true;
        })();

        testResult = await Promise.race([connectPromise, timeoutPromise]) as boolean;
        
      } else if (type === 'mysql') {
        return new Response(
          JSON.stringify({ ok: false, error_code: 'NOT_IMPLEMENTED', message: 'MySQL ainda não implementado' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
        
      } else if (type === 'mongodb') {
        return new Response(
          JSON.stringify({ ok: false, error_code: 'NOT_IMPLEMENTED', message: 'MongoDB ainda não implementado' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
        
      } else {
        throw new Error(`Tipo de conexão não suportado: ${type}`);
      }

    } catch (testError: any) {
      console.error('❌ Connection test failed:', testError);
      testResult = false;
      
      // Provide user-friendly error messages
      if (testError.message === 'TIMEOUT') {
        errorMessage = 'Timeout: Banco inacessível (verifique host/porta/firewall)';
      } else if (testError.message.includes('ECONNREFUSED')) {
        errorMessage = 'Banco inacessível (host/porta/firewall)';
      } else if (testError.message.includes('ETIMEDOUT')) {
        errorMessage = 'Timeout de conexão (verifique host/porta/firewall)';
      } else if (testError.message.includes('SSL') || testError.message.includes('TLS')) {
        errorMessage = 'Erro SSL/TLS: Habilite SSL require ou informe CA confiável';
      } else if (testError.message.includes('authentication')) {
        errorMessage = 'Falha na autenticação (usuário/senha incorretos)';
      } else {
        errorMessage = testError.message || 'Erro desconhecido na conexão';
      }
    }

    return new Response(
      JSON.stringify({
        ok: testResult,
        server_version: serverVersion,
        message: testResult ? 'Conexão bem-sucedida' : 'Falha na conexão',
        error_code: testResult ? null : 'CONNECTION_FAILED',
        error_message: testResult ? null : errorMessage
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error_code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor', 
        error_message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});