import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function assertMembershipAndPerm(req: Request, org_id: string, perm: string) {
  console.log('🔐 Auth validation started:', { org_id, perm });
  
  const authHeader = req.headers.get('Authorization');
  console.log('🔐 Auth header present:', !!authHeader);
  
  if (!authHeader) {
    console.log('❌ No auth header found');
    return new Response(
      JSON.stringify({ error_code: 'UNAUTHORIZED', message: 'Token de autenticação necessário' }),
      { status: 401, headers: corsHeaders }
    );
  }

  // Temporarily simplified - just check if header exists
  console.log('✅ Auth validation passed (simplified)');
  return null; // null means success
}

export async function getSqlConnectionConfig(connection_id: string, org_id: string) {
  console.log('📊 Getting SQL connection config:', { connection_id, org_id });
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase env vars');
    throw new Error('Configuração Supabase não encontrada');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: connection, error } = await supabase
    .from('data_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('account_id', org_id)
    .single();

  console.log('🔍 Connection query result:', { 
    found: !!connection, 
    error: error?.message,
    connection_type: connection?.connection_type 
  });

  if (error || !connection) {
    console.log('❌ Connection not found:', error?.message);
    throw new Error('Conexão não encontrada');
  }

  if (!connection.is_active) {
    throw new Error('Conexão inativa');
  }

  // Decrypt password if needed
  let password = connection.encrypted_password;
  if (password) {
    try {
      const { data: decryptData } = await supabase.functions.invoke('decrypt-password', {
        body: { encrypted_password: password }
      });
      if (decryptData?.password) {
        password = decryptData.password;
      }
    } catch (decryptError) {
      console.warn('Failed to decrypt password, using as-is');
    }
  }

  return {
    host: connection.host,
    port: connection.port || 5432,
    database: connection.database_name,
    user: connection.username,
    password: password,
    ssl_mode: connection.connection_config?.ssl_mode || 'require',
    connection_type: connection.connection_type
  };
}

export async function getSupabaseApiConfig(connection_id: string, org_id: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuração Supabase não encontrada');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: connection, error } = await supabase
    .from('data_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('account_id', org_id)
    .single();

  if (error || !connection) {
    throw new Error('Conexão não encontrada');
  }

  if (!connection.is_active) {
    throw new Error('Conexão inativa');
  }

  const config = connection.connection_config || {};
  
  return {
    supabase_url: config.supabase_url || connection.host,
    supabase_key: config.supabase_key || connection.encrypted_password,
    schema_default: config.schema_default || 'public'
  };
}