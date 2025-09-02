import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateConnectionRequest {
  org_id: string;
  workspace_id?: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_mode: 'require' | 'disable';
  update_id?: string; // For updating existing connections
  // Supabase API fields
  project_url?: string;
  anon_key?: string;
  service_role?: string;
  schema?: string;
  // REST API fields
  base_url?: string;
  auth_type?: string;
  auth_token?: string;
  headers_json?: string;
  test_path?: string;
}

// Unified encryption method matching decrypt function
async function encryptPassword(password: string): Promise<string> {
  const encryptionKey = Deno.env.get('DB_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }
  
  // Use the same method as encrypt-password function: base64 + delimiter
  const combined = password + '::' + encryptionKey.slice(0, 8);
  return btoa(combined);
}

function normalizeConnectionType(type: string): string {
  const t = type.toLowerCase();
  if (t === 'postgres' || t === 'postgresql' || t === 'supabase') return 'postgresql';
  if (t === 'supabase_api') return 'supabase_api';
  if (t === 'mysql') return 'mysql';
  if (t === 'rest') return 'rest';
  if (t === 'webhook') return 'webhook';
  throw new Error(`UNSUPPORTED_TYPE:${type}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const requestData: CreateConnectionRequest = await req.json();
    const isUpdate = !!requestData.update_id;
    console.log(`🔧 ${isUpdate ? 'Updating' : 'Creating'} ${requestData.type} connection for user ${user.id} in org ${requestData.org_id}`);

    // Validate org membership and permissions
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .eq('org_id', requestData.org_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error_code: 'FORBIDDEN',
          message: 'Sem acesso a esta organização'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Check permissions - only ADMIN or MASTER can create connections
    if (!['ADMIN', 'MASTER'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error_code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Sem permissão para criar conexões'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Normalize connection type
    const normalizedType = normalizeConnectionType(requestData.type);
    console.log(`🔧 Normalized type from ${requestData.type} to ${normalizedType}`);

    // Handle password encryption
    let encryptedPassword;
    if (isUpdate && requestData.password === 'unchanged') {
      // For updates, keep existing password if not changed
      const { data: existingConnection } = await supabaseClient
        .from('data_connections')
        .select('encrypted_password')
        .eq('id', requestData.update_id)
        .single();
      
      encryptedPassword = existingConnection?.encrypted_password;
    } else {
      // Encrypt new password
      encryptedPassword = await encryptPassword(requestData.password);
    }

    // Prepare connection data
    const connectionConfig: any = {
      ssl_mode: requestData.ssl_mode,
      workspace_id: requestData.workspace_id
    };
    
    // Add specific fields based on connection type
    if (normalizedType === 'supabase_api') {
      connectionConfig.project_url = requestData.project_url;
      connectionConfig.anon_key = requestData.anon_key;
      connectionConfig.service_role = requestData.service_role;
      connectionConfig.schema = requestData.schema || 'public';
    } else if (normalizedType === 'rest') {
      connectionConfig.base_url = requestData.base_url;
      connectionConfig.auth_type = requestData.auth_type;
      connectionConfig.auth_token = requestData.auth_token;
      connectionConfig.headers_json = requestData.headers_json;
      connectionConfig.test_path = requestData.test_path;
    }

    const connectionData = {
      account_id: requestData.org_id,
      name: requestData.name,
      connection_type: normalizedType,
      host: requestData.host || '',
      port: requestData.port || 5432,
      database_name: requestData.database || '',
      username: requestData.user || '',
      encrypted_password: encryptedPassword,
      ssl_enabled: requestData.ssl_mode === 'require',
      connection_config: connectionConfig,
      is_active: true,
      created_by: user.id
    };

    console.log('🔧 Connection data:', {
      ...connectionData,
      encrypted_password: '[HIDDEN]'
    });

    let connection;
    let operationType;

    if (isUpdate) {
      // Update existing connection
      const { data: updatedConnection, error: updateError } = await supabaseClient
        .from('data_connections')
        .update(connectionData)
        .eq('id', requestData.update_id)
        .eq('account_id', requestData.org_id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        throw new Error('Falha ao atualizar conexão');
      }

      connection = updatedConnection;
      operationType = 'updated';
    } else {
      // Create new connection
      const { data: newConnection, error: createError } = await supabaseClient
        .from('data_connections')
        .insert(connectionData)
        .select()
        .single();

      if (createError) {
        console.error('Failed to create connection:', createError);
        
        let message = 'Erro ao criar conexão';
        if (createError.code === '23505') {
          message = 'Já existe uma conexão com este nome';
        }
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error_code: 'CREATE_FAILED',
            message: message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      connection = newConnection;
      operationType = 'created';
    }

    // Log the operation for audit
    await supabaseClient
      .from('audit_logs')
      .insert({
        org_id: requestData.org_id,
        user_id: user.id,
        action: `connection_${operationType}`,
        resource_type: 'data_connection',
        resource_id: connection.id,
        metadata: {
          connection_name: requestData.name,
          connection_type: normalizedType,
          host: requestData.host,
          is_update: isUpdate
        }
      });

    console.log(`✅ Connection ${operationType} successfully: ${connection.id}`);

    // Return connection without sensitive data
    const responseConnection = {
      id: connection.id,
      name: connection.name,
      connection_type: connection.connection_type,
      host: connection.host,
      port: connection.port,
      database_name: connection.database_name,
      username: connection.username,
      ssl_enabled: connection.ssl_enabled,
      is_active: connection.is_active,
      created_at: connection.created_at
    };

    return new Response(
      JSON.stringify({
        success: true,
        connection: responseConnection,
        message: isUpdate ? 'Conexão atualizada com sucesso' : 'Conexão criada com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
    console.error('❌ Connection creation failed:', error);
    
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Erro interno do servidor';

    if (error.message.includes('UNSUPPORTED_TYPE')) {
      errorCode = 'UNSUPPORTED_TYPE';
      message = error.message;
    } else if (error.message.includes('Missing authorization')) {
      errorCode = 'UNAUTHORIZED';
      message = 'Token de autorização necessário';
    } else if (error.message.includes('Invalid user token')) {
      errorCode = 'INVALID_TOKEN';
      message = 'Token de usuário inválido';
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error_code: errorCode,
        message: message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});