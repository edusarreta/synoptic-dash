import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

interface DeleteConnectionRequest {
  org_id: string;
  connection_id: string;
}

serve(async (req) => {
  console.log('🗑️ delete-connection function called');
  
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

    const { org_id, connection_id }: DeleteConnectionRequest = await req.json();
    console.log('🗑️ Delete request for connection', connection_id, 'in org', org_id);

    if (!org_id || !connection_id) {
      return errorResponse('org_id e connection_id são obrigatórios', 400);
    }

    // Validate membership and permissions
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return errorResponse('Você não tem acesso a esta organização', 403);
    }

    // Check if user has permission to delete connections (MASTER or ADMIN)
    if (!['MASTER', 'ADMIN'].includes(profile.role)) {
      return errorResponse('Você não tem permissão para excluir conexões', 403);
    }

    // Verify connection exists and belongs to org
    const { data: connection, error: fetchError } = await admin
      .from('data_connections')
      .select('id, name')
      .eq('id', connection_id)
      .eq('account_id', org_id)
      .eq('is_active', true)
      .single();

    if (fetchError || !connection) {
      return errorResponse('Conexão não encontrada ou já foi excluída', 404);
    }

    // Perform soft delete by setting is_active = false
    const { error: deleteError } = await admin
      .from('data_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection_id)
      .eq('account_id', org_id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return errorResponse('Falha ao excluir conexão', 500);
    }

    // Log the deletion in audit logs
    try {
      await admin
        .from('audit_logs')
        .insert({
          org_id,
          user_id: user.id,
          action: 'connection_deleted',
          resource_type: 'data_connection',
          resource_id: connection_id,
          metadata: {
            connection_name: connection.name,
            deleted_by: user.id
          }
        });
    } catch (auditError) {
      console.warn('Failed to log audit:', auditError);
      // Don't fail the main operation
    }

    console.log('✅ Connection deleted successfully:', connection_id);
    return successResponse({
      message: `Conexão "${connection.name}" foi excluída com sucesso`
    });

  } catch (error: any) {
    console.error('Function error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});