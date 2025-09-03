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

  const startTime = Date.now();

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
    const { org_id, workspace_id, dataset_id, spec } = await req.json();

    if (!org_id || !dataset_id || !spec) {
      return new Response(
        JSON.stringify({ 
          code: 'MISSING_PARAMS', 
          message: 'org_id, dataset_id and spec are required',
          elapsed_ms: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ 
          code: 'ACCESS_DENIED', 
          message: 'Access denied to this organization',
          elapsed_ms: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get dataset
    let dataset;
    
    // Try saved_queries first
    const { data: datasetFromQueries } = await supabase
      .from('saved_queries')
      .select('id, org_id, connection_id, sql_query, name')
      .eq('id', dataset_id)
      .eq('org_id', org_id)
      .maybeSingle();

    if (datasetFromQueries) {
      dataset = datasetFromQueries;
    } else {
      // Try datasets table
      const { data: datasetFromDatasets } = await supabase
        .from('datasets')
        .select('id, org_id, connection_id, sql_query, name, source_type')
        .eq('id', dataset_id)
        .eq('org_id', org_id)
        .maybeSingle();

      if (datasetFromDatasets) {
        dataset = datasetFromDatasets;
      }
    }

    if (!dataset) {
      return new Response(
        JSON.stringify({ 
          code: 'DATASET_NOT_FOUND', 
          message: 'Dataset not found or access denied',
          elapsed_ms: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate SQL contains only SELECT
    if (!dataset.sql_query || !dataset.sql_query.trim().toLowerCase().startsWith('select')) {
      return new Response(
        JSON.stringify({ 
          code: 'ONLY_SELECT_ALLOWED', 
          message: 'Only SELECT queries are allowed in dataset base',
          elapsed_ms: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build aggregation SQL based on spec
    const { dims = [], metrics = [], orderBy = [], limit = 5000 } = spec;

    if (dims.length === 0 && metrics.length === 0) {
      return new Response(
        JSON.stringify({ 
          code: 'NO_FIELDS', 
          message: 'At least one dimension or metric is required',
          elapsed_ms: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SELECT clause
    const selectFields = [];
    const groupByFields = [];

    // Add dimensions
    dims.forEach((dim, index) => {
      selectFields.push(`"${dim.field}"`);
      groupByFields.push(index + 1);
    });

    // Add metrics with aggregations
    metrics.forEach(metric => {
      const agg = metric.agg.toUpperCase();
      if (agg === 'COUNT_DISTINCT') {
        selectFields.push(`COUNT(DISTINCT "${metric.field}") AS "${metric.field}_${metric.agg}"`);
      } else {
        selectFields.push(`${agg}("${metric.field}") AS "${metric.field}_${metric.agg}"`);
      }
    });

    // Build final SQL
    const selectClause = selectFields.join(', ');
    const groupByClause = groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : '';
    const orderByClause = orderBy.length > 0 
      ? `ORDER BY ${orderBy.map(o => `"${o.field}" ${o.dir}`).join(', ')}`
      : 'ORDER BY 1';
    
    const finalSQL = `
      SELECT ${selectClause}
      FROM (${dataset.sql_query}) AS base
      ${groupByClause}
      ${orderByClause}
      LIMIT ${Math.min(limit, 5000)}
    `.trim();

    console.log('Generated SQL:', finalSQL);

    // Execute query
    if (!dataset.connection_id || dataset.name === 'top10' || dataset.sql_query.includes('UNION ALL')) {
      // Synthetic dataset - execute directly
      try {
        const { data: result, error: sqlError } = await supabase.rpc('execute_sql', {
          query: finalSQL
        });

        if (sqlError) {
          console.error('SQL execution error:', sqlError);
          return new Response(
            JSON.stringify({ 
              code: 'QUERY_FAILED', 
              message: sqlError.message,
              elapsed_ms: Date.now() - startTime
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Process result
        const columns = [];
        const rows = [];

        if (result && Array.isArray(result) && result.length > 0) {
          const firstRow = result[0];
          
          // Generate column metadata
          Object.keys(firstRow).forEach(key => {
            const value = firstRow[key];
            let type = 'text';
            
            if (typeof value === 'number') {
              type = Number.isInteger(value) ? 'int' : 'float';
            } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
              type = 'date';
            } else if (typeof value === 'boolean') {
              type = 'bool';
            }
            
            columns.push({ name: key, type });
          });

          // Convert to array format
          result.forEach(row => {
            const rowArray = columns.map(col => row[col.name]);
            rows.push(rowArray);
          });
        }

        return new Response(
          JSON.stringify({
            columns,
            rows,
            truncated: rows.length >= limit,
            elapsed_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Direct SQL execution failed:', error);
        return new Response(
          JSON.stringify({ 
            code: 'QUERY_FAILED', 
            message: error.message,
            elapsed_ms: Date.now() - startTime
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // External connection - use run-sql-query
      try {
        const { data: queryResult, error: queryError } = await supabase.functions.invoke('run-sql-query', {
          body: {
            connection_id: dataset.connection_id,
            query: finalSQL,
            limit: Math.min(limit, 5000)
          }
        });

        if (queryError) {
          return new Response(
            JSON.stringify({ 
              code: 'QUERY_FAILED', 
              message: queryError.message,
              elapsed_ms: Date.now() - startTime
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (queryResult?.error_code) {
          return new Response(
            JSON.stringify({ 
              code: queryResult.error_code, 
              message: queryResult.message,
              elapsed_ms: Date.now() - startTime
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            columns: queryResult.columns || [],
            rows: queryResult.rows || [],
            truncated: queryResult.truncated || false,
            elapsed_ms: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('External query failed:', error);
        return new Response(
          JSON.stringify({ 
            code: 'QUERY_FAILED', 
            message: error.message,
            elapsed_ms: Date.now() - startTime
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Widget run error:', error);
    return new Response(
      JSON.stringify({ 
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        elapsed_ms: Date.now() - startTime
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});