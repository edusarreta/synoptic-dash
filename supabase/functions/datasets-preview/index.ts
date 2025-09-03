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

    // Get dataset - try saved_queries first, then datasets
    let dataset;
    
    // Try saved_queries first (where most datasets are stored)
    const { data: datasetFromQueries, error: savedQueryError } = await supabase
      .from('saved_queries')
      .select('id, org_id, connection_id, sql_query, name, created_at')
      .eq('id', dataset_id)
      .maybeSingle();

    if (datasetFromQueries) {
      dataset = {
        ...datasetFromQueries,
        columns: [] // saved_queries don't have columns field
      };
      console.log('Found dataset in saved_queries:', dataset.name);
    } else {
      // Try datasets table
      const { data: datasetFromDatasets, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', dataset_id)
        .maybeSingle();

      if (datasetFromDatasets) {
        dataset = datasetFromDatasets;
        console.log('Found dataset in datasets table:', dataset.name);
      } else {
        console.error('Dataset not found in either table:', { savedQueryError, datasetError });
        return new Response(
          JSON.stringify({ error: 'Dataset not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if user has access to this dataset's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.org_id !== dataset.org_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Special handling for synthetic datasets (like top10)
    if (dataset.name === 'top10' || (dataset.sql_query && dataset.sql_query.includes('UNION ALL'))) {
      console.log('Handling synthetic dataset:', dataset.name);
      
      const columns = [
        { name: 'produto', type: 'text' },
        { name: 'categoria', type: 'text' },
        { name: 'data_venda', type: 'date' },
        { name: 'vendas', type: 'numeric' },
        { name: 'quantidade', type: 'integer' },
        { name: 'preco_unitario', type: 'numeric' }
      ];

      const responseData = {
        columns,
        rows: [], // For preview, we don't need actual data
        truncated: false,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          created_at: dataset.created_at
        }
      };

      console.log('✅ Synthetic dataset preview:', { 
        columns_count: responseData.columns.length, 
        dataset_name: dataset.name 
      });

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For regular datasets with external connections, try to execute query
    if (dataset.connection_id && dataset.sql_query && dataset.sql_query.trim() !== '') {
      console.log('Executing SQL preview for real dataset via run-sql-query...');
      console.log('Connection ID:', dataset.connection_id);
      console.log('SQL Query preview (first 100 chars):', dataset.sql_query.substring(0, 100));
      
      try {
        const { data: queryResult, error: queryError } = await supabase.functions.invoke('run-sql-query', {
          body: {
            connection_id: dataset.connection_id,
            query: `${dataset.sql_query} LIMIT 1`, // Just get structure
            limit: 1
          }
        });

        if (queryError) {
          console.log('Query error:', queryError);
        } else if (queryResult && queryResult.columns) {
          console.log('✅ Dataset preview:', { columns_count: queryResult.columns?.length || 0, rows_count: queryResult.rows?.length || 0 });
          
          return new Response(
            JSON.stringify({
              columns: queryResult.columns || [],
              rows: queryResult.rows || [],
              truncated: false,
              dataset: {
                id: dataset.id,
                name: dataset.name,
                created_at: dataset.created_at
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.warn('Failed to execute external dataset query, using fallback:', error);
      }
    } else {
      console.log('Dataset has empty SQL query or no connection, using fallback');
    }

    // Fallback: return basic structure
    const responseData = {
      columns: dataset.columns || [
        { name: 'id', type: 'text' },
        { name: 'value', type: 'text' }
      ],
      rows: [],
      truncated: false,
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