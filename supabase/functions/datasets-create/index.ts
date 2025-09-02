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

    const { 
      org_id, 
      workspace_id, 
      connection_id, 
      name, 
      sql_query, 
      description, 
      params = {},
      ttl_sec = 300 
    } = await req.json()

    console.log('📦 Creating dataset:', { org_id, name, connection_id, has_sql: !!sql_query });

    if (!name || !sql_query || !connection_id || !org_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, sql_query, connection_id, org_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check permission
    if (!['MASTER', 'ADMIN', 'EDITOR'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First run the query with LIMIT 1 to get column structure
    const previewResponse = await supabase.functions.invoke('run-sql-query', {
      body: {
        org_id,
        connection_id,
        sql: sql_query,
        params,
        mode: 'preview',
        row_limit: 1
      }
    })

    if (previewResponse.error) {
      return new Response(
        JSON.stringify({ error: 'Failed to preview query for columns', details: previewResponse.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const columns = previewResponse.data?.columns || []

    console.log('📦 Inferred columns:', columns);

    // Create dataset with proper column structure
    const { data: dataset, error: createError } = await supabase
      .from('datasets')
      .insert({
        org_id,
        workspace_id,
        connection_id,
        name,
        description,
        sql_query,
        source_type: 'sql',
        columns,
        cache_ttl_seconds: ttl_sec,
        last_updated: new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Dataset creation error:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create dataset', details: createError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Dataset created:', dataset.id, dataset.name);

    return new Response(
      JSON.stringify({ 
        id: dataset.id,
        name: dataset.name,
        columns
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating dataset:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})