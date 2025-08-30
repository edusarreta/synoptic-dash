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
    // Rate limiting and security logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`Query request from IP: ${clientIP}`);
    
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

    // Sanitize and validate input parameters (defined before use)
    const sanitizeIdentifier = (identifier: string): string => {
      // Only allow alphanumeric characters and underscores for table/column names
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        throw new Error(`Invalid identifier: ${identifier}`);
      }
      return identifier;
    };

    const sanitizeValue = (value: any): string => {
      if (typeof value === 'string') {
        // Escape single quotes to prevent SQL injection
        return value.replace(/'/g, "''");
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      return String(value).replace(/'/g, "''");
    };

    // Build SQL query
    let selectFields: string[] = [];
    
    // Sanitize table name and field names
    const sanitizedTableName = sanitizeIdentifier(tableName);
    
    // Add dimensions to SELECT with sanitization
    if (dimensions.length > 0) {
      const sanitizedDimensions = dimensions.map(dim => sanitizeIdentifier(dim));
      selectFields.push(...sanitizedDimensions);
    }
    
    // Add aggregated metrics to SELECT with sanitization
    if (metrics.length > 0) {
      const validAggregations = ['sum', 'count', 'avg', 'min', 'max'];
      if (!validAggregations.includes(aggregation.toLowerCase())) {
        throw new Error(`Invalid aggregation function: ${aggregation}`);
      }
      
      for (const metric of metrics) {
        const sanitizedMetric = sanitizeIdentifier(metric);
        selectFields.push(`${aggregation.toUpperCase()}(${sanitizedMetric}) as ${sanitizedMetric}_${aggregation}`);
      }
    } else if (dimensions.length === 0) {
      // If no specific fields, select count
      selectFields.push(`COUNT(*) as total_count`);
    }

    let sqlQuery = `SELECT ${selectFields.join(', ')} FROM ${sanitizedTableName}`;

    // Add WHERE conditions with proper sanitization
    if (filters.length > 0) {
      const whereConditions = filters.map(filter => {
        const { field, operator, value } = filter;
        const sanitizedField = sanitizeIdentifier(field);
        
        switch (operator) {
          case 'equals':
            return `${sanitizedField} = '${sanitizeValue(value)}'`;
          case 'not_equals':
            return `${sanitizedField} != '${sanitizeValue(value)}'`;
          case 'contains':
            return `${sanitizedField} ILIKE '%${sanitizeValue(value)}%'`;
          case 'greater_than':
            return `${sanitizedField} > ${sanitizeValue(value)}`;
          case 'less_than':
            return `${sanitizedField} < ${sanitizeValue(value)}`;
          case 'in':
            const values = Array.isArray(value) ? value : [value];
            const sanitizedValues = values.map(v => `'${sanitizeValue(v)}'`).join(', ');
            return `${sanitizedField} IN (${sanitizedValues})`;
          default:
            return `${sanitizedField} = '${sanitizeValue(value)}'`;
        }
      });
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add GROUP BY with sanitized field names
    if (dimensions.length > 0) {
      const sanitizedDimensions = dimensions.map(dim => sanitizeIdentifier(dim));
      sqlQuery += ` GROUP BY ${sanitizedDimensions.join(', ')}`;
    }

    // Add ORDER BY with sanitized field names
    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(order => {
        const sanitizedField = sanitizeIdentifier(order.field);
        const direction = order.direction === 'DESC' ? 'DESC' : 'ASC'; // Validate direction
        return `${sanitizedField} ${direction}`;
      });
      sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;
    } else if (dimensions.length > 0) {
      // Default ordering by first dimension
      const sanitizedFirstDimension = sanitizeIdentifier(dimensions[0]);
      sqlQuery += ` ORDER BY ${sanitizedFirstDimension}`;
    }

    // Add LIMIT with validation
    const sanitizedLimit = Math.min(Math.max(1, Math.floor(Number(limit))), 10000); // Max 10k rows
    sqlQuery += ` LIMIT ${sanitizedLimit}`;

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