import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { dataset_id, org_id, workspace_id, limit = 100, offset = 0 } = await req.json()

    console.log('🔍 Previewing dataset:', { dataset_id, limit, offset });

    if (!dataset_id) {
      return new Response(
        JSON.stringify({ error: 'dataset_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single()

    if (datasetError || !dataset) {
      console.error('Dataset not found:', datasetError);
      return new Response(
        JSON.stringify({ error: 'Dataset not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access to this dataset's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.org_id !== dataset.org_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Execute the dataset query with proper parameters
    const queryResponse = await supabase.functions.invoke('run-sql-query', {
      body: {
        connection_id: dataset.connection_id,
        query: dataset.sql_query,
        limit,
        offset
      },
      headers: { Authorization: authHeader }
    })

    if (queryResponse.error) {
      console.error('Failed to execute dataset query:', queryResponse.error);
      return new Response(
        JSON.stringify({ error: 'Failed to execute dataset query', details: queryResponse.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseData = {
      columns: queryResponse.data?.columns || dataset.columns || [],
      rows: queryResponse.data?.rows || [],
      truncated: queryResponse.data?.truncated || false,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        created_at: dataset.created_at
      }
    };

    console.log('✅ Dataset preview:', { 
      columns_count: responseData.columns.length, 
      rows_count: responseData.rows.length 
    });

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error previewing dataset:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})