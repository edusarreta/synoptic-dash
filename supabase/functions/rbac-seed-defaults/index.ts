import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SeedDefaultsRequest {
  org_id: string;
}

const DEFAULT_PERMISSIONS = [
  // Connections
  { code: 'connections:create', module: 'connections', description: 'Criar conexões' },
  { code: 'connections:read', module: 'connections', description: 'Ler conexões' },
  { code: 'connections:update', module: 'connections', description: 'Atualizar conexões' },
  { code: 'connections:delete', module: 'connections', description: 'Excluir conexões' },
  { code: 'connections:test', module: 'connections', description: 'Testar conexões' },
  { code: 'connections:use', module: 'connections', description: 'Usar conexões' },
  
  // Catalog
  { code: 'catalog:read', module: 'catalog', description: 'Explorar schemas/tabelas/colunas' },
  
  // SQL
  { code: 'sql:run', module: 'sql', description: 'Executar SELECT' },
  { code: 'sql:save', module: 'sql', description: 'Salvar consultas' },
  
  // Saved Queries
  { code: 'saved_queries:read', module: 'saved_queries', description: 'Ver queries salvas' },
  { code: 'saved_queries:create', module: 'saved_queries', description: 'Criar query salva' },
  { code: 'saved_queries:update', module: 'saved_queries', description: 'Editar query salva' },
  { code: 'saved_queries:delete', module: 'saved_queries', description: 'Excluir query salva' },
  
  // Datasets
  { code: 'datasets:read', module: 'datasets', description: 'Ver datasets' },
  { code: 'datasets:create', module: 'datasets', description: 'Criar dataset' },
  { code: 'datasets:update', module: 'datasets', description: 'Editar dataset' },
  { code: 'datasets:delete', module: 'datasets', description: 'Excluir dataset' },
  
  // Charts
  { code: 'charts:read', module: 'charts', description: 'Ver gráficos' },
  { code: 'charts:create', module: 'charts', description: 'Criar gráfico' },
  { code: 'charts:update', module: 'charts', description: 'Editar gráfico' },
  { code: 'charts:delete', module: 'charts', description: 'Excluir gráfico' },
  { code: 'charts:update_spec', module: 'charts', description: 'Editar especificação do gráfico' },
  
  // Dashboards
  { code: 'dashboards:read', module: 'dashboards', description: 'Ver dashboards' },
  { code: 'dashboards:create', module: 'dashboards', description: 'Criar dashboard' },
  { code: 'dashboards:update', module: 'dashboards', description: 'Editar dashboard' },
  { code: 'dashboards:update_layout', module: 'dashboards', description: 'Editar layout' },
  { code: 'dashboards:publish', module: 'dashboards', description: 'Publicar' },
  { code: 'dashboards:share', module: 'dashboards', description: 'Compartilhar' },
  { code: 'dashboards:delete', module: 'dashboards', description: 'Excluir' },
  
  // Embed
  { code: 'embed:use', module: 'embed', description: 'Usar embed' },
  
  // RBAC
  { code: 'rbac:read', module: 'rbac', description: 'Ver permissões' },
  { code: 'rbac:manage', module: 'rbac', description: 'Gerenciar permissões' },
  
  // Audit
  { code: 'audit:read', module: 'audit', description: 'Ver auditoria' },
];

const ROLE_PERMISSIONS = {
  MASTER: 'all', // All permissions
  ADMIN: 'all', // All permissions
  EDITOR: [
    'connections:read', 'connections:use',
    'catalog:read',
    'sql:run', 'sql:save',
    'saved_queries:read', 'saved_queries:create', 'saved_queries:update', 'saved_queries:delete',
    'datasets:read', 'datasets:create', 'datasets:update', 'datasets:delete',
    'charts:read', 'charts:create', 'charts:update', 'charts:update_spec',
    'dashboards:read', 'dashboards:create', 'dashboards:update_layout', 'dashboards:publish', 'dashboards:share',
    'embed:use',
    'rbac:read'
  ],
  VIEWER: [
    'dashboards:read',
    'charts:read',
    'datasets:read',
    'saved_queries:read'
  ]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { org_id }: SeedDefaultsRequest = await req.json();

    if (!org_id) {
      return new Response(
        JSON.stringify({ error: 'org_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Seeding default permissions for org: ${org_id}`);

    // 1. UPSERT permissions catalog
    console.log('Upserting permissions catalog...');
    for (const perm of DEFAULT_PERMISSIONS) {
      const { error } = await supabaseClient
        .from('permissions')
        .upsert(perm, { onConflict: 'code' });
      
      if (error) {
        console.error(`Error upserting permission ${perm.code}:`, error);
      }
    }

    // 2. UPSERT role permissions for this org
    console.log('Upserting role permissions...');
    
    const allPermissionCodes = DEFAULT_PERMISSIONS.map(p => p.code);
    
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      const permissionCodes = perms === 'all' ? allPermissionCodes : perms as string[];
      
      for (const permCode of permissionCodes) {
        const { error } = await supabaseClient
          .from('role_permissions')
          .upsert(
            { org_id, role, perm_code: permCode },
            { onConflict: 'org_id,role,perm_code' }
          );
        
        if (error) {
          console.error(`Error upserting role permission ${role}:${permCode}:`, error);
        }
      }
      
      console.log(`✅ Seeded ${permissionCodes.length} permissions for ${role} role`);
    }

    const result = {
      success: true,
      org_id,
      permissions_seeded: DEFAULT_PERMISSIONS.length,
      roles_configured: Object.keys(ROLE_PERMISSIONS).length
    };

    console.log('Seed defaults completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rbac-seed-defaults:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});