import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  connectionId: string;
  tableName: string;
  metrics?: string[];
  dimensions?: string[];
  aggregation?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  groupBy?: string[];
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
  limit?: number;
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
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          success: false 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create supabase client with proper auth
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication token',
          success: false,
          details: authError?.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated:', user.id);

    const {
      connectionId,
      tableName,
      metrics = [],
      dimensions = [],
      aggregation = 'sum',
      filters = [],
      groupBy = [],
      orderBy = [],
      limit = 1000
    }: QueryRequest = await req.json();

    console.log('📊 Query request:', {
      connectionId,
      tableName,
      metrics,
      dimensions,
      aggregation,
      filters: filters.length,
      groupBy,
      orderBy,
      limit
    });

    // Validate connection belongs to user's account
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const { data: connection } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('account_id', profile.account_id)
      .eq('is_active', true)
      .single();

    if (!connection) {
      throw new Error('Connection not found or not accessible');
    }

    console.log('✅ Connection validated for account:', profile.account_id);

    // Build SQL query
    let selectFields: string[] = [];
    
    // Add dimensions to SELECT
    if (dimensions.length > 0) {
      selectFields.push(...dimensions);
    }
    
    // Add aggregated metrics to SELECT
    if (metrics.length > 0) {
      for (const metric of metrics) {
        selectFields.push(`${aggregation.toUpperCase()}(${metric}) as ${metric}_${aggregation}`);
      }
    } else if (dimensions.length === 0) {
      // If no specific fields, select count
      selectFields.push(`COUNT(*) as total_count`);
    }

    let sqlQuery = `SELECT ${selectFields.join(', ')} FROM ${tableName}`;

    // Add WHERE conditions
    if (filters.length > 0) {
      const whereConditions = filters.map(filter => {
        const { field, operator, value } = filter;
        switch (operator) {
          case 'equals':
            return `${field} = '${value}'`;
          case 'not_equals':
            return `${field} != '${value}'`;
          case 'contains':
            return `${field} ILIKE '%${value}%'`;
          case 'greater_than':
            return `${field} > ${value}`;
          case 'less_than':
            return `${field} < ${value}`;
          case 'in':
            const values = Array.isArray(value) ? value : [value];
            return `${field} IN (${values.map(v => `'${v}'`).join(', ')})`;
          default:
            return `${field} = '${value}'`;
        }
      });
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add GROUP BY
    if (dimensions.length > 0) {
      sqlQuery += ` GROUP BY ${dimensions.join(', ')}`;
    }

    // Add ORDER BY
    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(order => `${order.field} ${order.direction}`);
      sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;
    } else if (dimensions.length > 0) {
      // Default ordering by first dimension
      sqlQuery += ` ORDER BY ${dimensions[0]}`;
    }

    // Add LIMIT
    sqlQuery += ` LIMIT ${limit}`;

    console.log('🔍 Generated SQL:', sqlQuery);

    // Execute the query using the existing execute-sql-query function
    const { data: queryResult, error: queryError } = await supabase.functions.invoke('execute-sql-query', {
      body: {
        connectionId,
        sqlQuery
      }
    });

    if (queryError) {
      console.error('❌ Query execution error:', queryError);
      throw queryError;
    }

    if (!queryResult?.success) {
      console.error('❌ Query failed:', queryResult);
      throw new Error(queryResult?.error || 'Query execution failed');
    }

    console.log('✅ Query executed successfully:', {
      rowCount: queryResult.rowCount,
      columnsCount: queryResult.columns?.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: queryResult.data,
        rowCount: queryResult.rowCount,
        columns: queryResult.columns,
        query: sqlQuery
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 Error in query-database:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});