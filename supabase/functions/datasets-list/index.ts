import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { org_id, workspace_id } = await req.json();

    if (!org_id) {
      return new Response(
        JSON.stringify({ error: 'org_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.org_id !== org_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for datasets
    let datasetsQuery = supabase
      .from('datasets')
      .select('id, name, description, columns, created_at, sql_query, connection_id, source_type')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false });

    // Add workspace filter if provided
    if (workspace_id) {
      datasetsQuery = datasetsQuery.eq('workspace_id', workspace_id);
    }

    // Load datasets and saved queries in parallel
    const [datasetsResult, savedQueriesResult] = await Promise.all([
      datasetsQuery,
      supabase
        .from('saved_queries')
        .select('id, name, description, created_at, sql_query, connection_id')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })
    ]);
    
    if (datasetsResult.error) throw datasetsResult.error;
    if (savedQueriesResult.error) throw savedQueriesResult.error;
    
    // Format datasets
    const datasets = (datasetsResult.data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      connection_id: item.connection_id,
      kind: item.source_type === 'rest' ? 'rest' : 'sql',
      columns: item.columns || [],
      created_at: item.created_at,
      sql_query: item.sql_query,
      type: 'dataset',
      source_type: item.source_type || 'sql'
    }));
    
    // Format saved queries as datasets
    const savedQueries = (savedQueriesResult.data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      connection_id: item.connection_id,
      kind: 'sql',
      columns: [], // Will be inferred when selected
      created_at: item.created_at,
      sql_query: item.sql_query,
      type: 'saved_query',
      source_type: 'sql'
    }));
    
    const allItems = [...datasets, ...savedQueries];
    
    console.log(`Found ${datasets.length} datasets and ${savedQueries.length} saved queries for org ${org_id}`);

    return new Response(
      JSON.stringify({
        items: allItems,
        total: allItems.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in datasets-list:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});