// Helper compartilhado para conexões de banco de dados
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface DbConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_enabled: boolean;
}

export interface DbConnection {
  id: string;
  name: string;
  connection_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  encrypted_password: string;
  ssl_enabled: boolean;
}

/**
 * Normaliza tipo de conexão para PostgreSQL padrão
 */
export function normalizeConnectionType(type: string): string {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'supabase':
    case 'supabase_postgres':
    case 'supabase (postgres db)':
    case 'postgres':
      return 'postgresql';
    case 'mysql':
      return 'mysql';
    case 'rest':
    case 'rest_api':
      return 'rest';
    default:
      return 'postgresql';
  }
}

/**
 * Escapa identificadores SQL (schema/table names)
 */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Obtém configuração de conexão PostgreSQL validada
 */
export async function getPgClient(connectionId: string, orgId: string, userToken: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Validar auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
  if (authError || !user) {
    throw new Error('Token inválido');
  }

  // Validar membership/permissão
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.org_id !== orgId) {
    throw new Error('Acesso negado');
  }

  // Buscar conexão
  const { data: connection, error: connError } = await supabase
    .from('data_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('account_id', orgId)
    .eq('is_active', true)
    .single();

  if (connError || !connection) {
    throw new Error('Conexão não encontrada ou inativa');
  }

  // Validar tipo
  const normalizedType = normalizeConnectionType(connection.connection_type);
  if (normalizedType !== 'postgresql') {
    throw new Error('Apenas conexões PostgreSQL são suportadas');
  }

  // Descriptografar senha
  let decryptedPassword = connection.encrypted_password;
  try {
    const { data: decryptData, error: decryptError } = await supabase.functions.invoke('decrypt-password', {
      body: { encrypted_password: connection.encrypted_password }
    });

    if (!decryptError && decryptData?.decrypted_password) {
      decryptedPassword = decryptData.decrypted_password;
    } else {
      console.warn('Fallback to raw password due to decryption failure');
    }
  } catch (e) {
    console.warn('Decrypt function unavailable, using raw password');
  }

  // Configurar SSL baseado no tipo
  let sslConfig;
  if (connection.connection_type.toLowerCase().includes('supabase')) {
    sslConfig = { enabled: true, enforce: false }; // Supabase requer SSL
  } else {
    sslConfig = connection.ssl_enabled ? { enabled: true, enforce: false } : { enabled: false };
  }

  const config: DbConnectionConfig = {
    host: connection.host,
    port: connection.port || 5432,
    database: connection.database_name,
    user: connection.username, // Mapear username -> user
    password: decryptedPassword,
    ssl_enabled: sslConfig.enabled
  };

  console.log('🔌 DB Config prepared:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: config.ssl_enabled
  });

  return config;
}

/**
 * Cria cliente PostgreSQL com configuração robusta
 */
export async function createPgClient(config: DbConnectionConfig) {
  const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
  
  // Configuração robusta do cliente
  const clientConfig = {
    hostname: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    tls: config.ssl_enabled ? { enabled: true, enforce: false } : { enabled: false }
  };

  const client = new Client(clientConfig);
  
  try {
    await client.connect();
    console.log('✅ PostgreSQL connected');
    return client;
  } catch (error: any) {
    console.error('💥 PostgreSQL connection failed:', error.message);
    
    // Tentar fallback sem SSL em caso de erro SCRAM/SSL
    if (error.message?.includes('scram') || error.message?.includes('SSL')) {
      console.log('🔄 Trying fallback without SSL...');
      const fallbackConfig = {
        ...clientConfig,
        tls: { enabled: false }
      };
      
      const fallbackClient = new Client(fallbackConfig);
      await fallbackClient.connect();
      console.log('✅ PostgreSQL connected (fallback)');
      return fallbackClient;
    }
    
    throw error;
  }
}