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
        JSON.stringify({ code: 'UNAUTHORIZED', message: 'Authorization header required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: 'Invalid authentication' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { org_id, workspace_id, dataset_id } = await req.json();

    if (!org_id || !dataset_id) {
      return new Response(
        JSON.stringify({ code: 'MISSING_PARAMS', message: 'org_id and dataset_id are required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ code: 'ACCESS_DENIED', message: 'Access denied to this organization' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get dataset from saved_queries first
    const { data: datasetFromQueries } = await supabase
      .from('saved_queries')
      .select('id, org_id, connection_id, sql_query, name, description, created_at, parameters')
      .eq('id', dataset_id)
      .eq('org_id', org_id)
      .maybeSingle();

    if (datasetFromQueries) {
      return new Response(
        JSON.stringify({
          id: datasetFromQueries.id,
          name: datasetFromQueries.name,
          description: datasetFromQueries.description,
          connection_id: datasetFromQueries.connection_id,
          kind: 'sql',
          sql: datasetFromQueries.sql_query,
          params: datasetFromQueries.parameters || {},
          columns: [], // Will be inferred when needed
          created_at: datasetFromQueries.created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try datasets table
    const { data: datasetFromDatasets } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .eq('org_id', org_id)
      .maybeSingle();

    if (datasetFromDatasets) {
      return new Response(
        JSON.stringify({
          id: datasetFromDatasets.id,
          name: datasetFromDatasets.name,
          description: datasetFromDatasets.description,
          connection_id: datasetFromDatasets.connection_id,
          kind: datasetFromDatasets.source_type === 'rest' ? 'rest' : 'sql',
          sql: datasetFromDatasets.sql_query,
          params: {},
          columns: datasetFromDatasets.columns || [],
          created_at: datasetFromDatasets.created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dataset not found
    return new Response(
      JSON.stringify({ code: 'DATASET_NOT_FOUND', message: 'Dataset not found or access denied' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in datasets-get:', error);
    return new Response(
      JSON.stringify({ 
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});