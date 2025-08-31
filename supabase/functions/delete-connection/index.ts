import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteConnectionRequest {
  org_id: string;
  connection_id: string;
}

serve(async (req) => {
  console.log('delete-connection function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DeleteConnectionRequest = await req.json();
    const { org_id, connection_id } = body;

    if (!org_id || !connection_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'org_id e connection_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting connection:', { org_id, connection_id, user_id: user.id });

    // Verify user has permission to delete connections
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has delete permission (MASTER/ADMIN roles can delete)
    if (!['MASTER', 'ADMIN'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Permissão insuficiente para excluir conexões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify connection belongs to the organization
    const { data: connection, error: fetchError } = await supabase
      .from('data_connections')
      .select('id, name, account_id')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .single();

    if (fetchError || !connection) {
      console.error('Connection fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, message: 'Conexão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Soft delete: set deleted_at timestamp
    const { error: deleteError } = await supabase
      .from('data_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection_id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ success: false, message: 'Falha ao excluir conexão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the deletion for audit
    try {
      await supabase.from('audit_logs').insert({
        org_id,
        user_id: user.id,
        action: 'connections:delete',
        resource_type: 'connection',
        resource_id: connection_id,
        metadata: {
          connection_name: connection.name,
          deleted_at: new Date().toISOString()
        }
      });
    } catch (auditError) {
      console.warn('Failed to log audit:', auditError);
      // Don't fail the operation for audit logging issues
    }

    console.log('Connection deleted successfully:', connection_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Conexão "${connection.name}" foi excluída com sucesso` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})