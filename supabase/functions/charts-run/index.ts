import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { corsHeaders, handleCORS, errorResponse, successResponse } from "../_shared/admin.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use Service Role for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChartsRunPayload {
  org_id: string;
  workspace_id?: string;
  dataset_id: string;
  dims: Array<{ field: string; alias: string }>;
  metrics: Array<{ field: string; agg: string; alias: string }>;
  filters?: Array<any>;
  order?: Array<any>;
  limit?: number;
  offset?: number;
}

// Validar identificadores seguros (apenas letras, números e underscore)
function isValidIdentifier(str: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(str);
}

// Validar agregações permitidas
function isValidAggregation(agg: string): boolean {
  const validAggs = ['sum', 'avg', 'min', 'max', 'count', 'count_distinct'];
  return validAggs.includes(agg.toLowerCase());
}

// Mapear agregações
function mapAggregation(agg: string, field: string): string {
  const aggLower = agg.toLowerCase();
  if (aggLower === 'count_distinct') {
    return `COUNT(DISTINCT "${field}")`;
  }
  return `${aggLower.toUpperCase()}("${field}")`;
}

serve(async (req) => {
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const startTime = Date.now();

  try {
    const {
      org_id,
      workspace_id,
      dataset_id,
      dims = [],
      metrics = [],
      filters = [],
      order = [],
      limit = 1000,
      offset = 0
    }: ChartsRunPayload = await req.json();

    console.log('Charts run request:', { org_id, dataset_id, dims, metrics });

    // Validar entrada básica
    if (!org_id || !dataset_id) {
      return successResponse({
        error_code: 'MISSING_PARAMS',
        message: 'org_id e dataset_id são obrigatórios',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Verificar se o usuário tem acesso à organização
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return successResponse({
        error_code: 'FORBIDDEN',
        message: 'Usuário sem acesso - token não encontrado',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Validar identificadores das dimensões
    for (const dim of dims) {
      if (!isValidIdentifier(dim.field) || !isValidIdentifier(dim.alias)) {
        return successResponse({
          error_code: 'INVALID_IDENTIFIER',
          message: `Identificador inválido: ${dim.field} ou ${dim.alias}`,
          elapsed_ms: Date.now() - startTime
        });
      }
    }

    // Validar identificadores e agregações das métricas
    for (const metric of metrics) {
      if (!isValidIdentifier(metric.field) || !isValidIdentifier(metric.alias)) {
        return successResponse({
          error_code: 'INVALID_IDENTIFIER',
          message: `Identificador inválido: ${metric.field} ou ${metric.alias}`,
          elapsed_ms: Date.now() - startTime
        });
      }
      if (!isValidAggregation(metric.agg)) {
        return successResponse({
          error_code: 'INVALID_AGGREGATION',
          message: `Agregação inválida: ${metric.agg}`,
          elapsed_ms: Date.now() - startTime
        });
      }
    }

    // Buscar dataset primeiro em datasets, depois em saved_queries
    let dataset;
    
    console.log('Searching for dataset:', { dataset_id, org_id, workspace_id });
    
    // Tentar buscar na tabela datasets primeiro (sem filtro de org_id inicial)
    const { data: datasetFromDatasets, error: datasetError1 } = await supabase
      .from('datasets')
      .select('id, org_id, workspace_id, connection_id, sql_query, name')
      .eq('id', dataset_id)
      .single();

    if (datasetFromDatasets) {
      dataset = datasetFromDatasets;
      console.log('Found dataset in datasets table:', dataset);
    } else {
      console.log('Dataset not found in datasets table, searching saved_queries');
      // Se não encontrar em datasets, buscar em saved_queries
      const { data: datasetFromQueries, error: datasetError2 } = await supabase
        .from('saved_queries')
        .select('id, org_id, workspace_id, connection_id, sql_query, name')
        .eq('id', dataset_id)
        .single();

      if (datasetFromQueries) {
        dataset = datasetFromQueries;
        console.log('Found dataset in saved_queries table:', dataset);
      }
    }

    if (!dataset) {
      console.error('Dataset not found in both datasets and saved_queries tables');
      return successResponse({
        error_code: 'DATASET_NOT_FOUND',
        message: 'Dataset não encontrado',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Verificar se o usuário tem acesso ao dataset (org_id deve bater)
    if (dataset.org_id !== org_id) {
      console.error('Dataset org mismatch:', { dataset_org_id: dataset.org_id, requested_org_id: org_id });
      return successResponse({
        error_code: 'DATASET_NOT_FOUND',
        message: 'Dataset não encontrado ou sem acesso',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Verificar se há dimensões ou métricas para processar
    if (dims.length === 0 && metrics.length === 0) {
      return successResponse({
        error_code: 'NO_FIELDS',
        message: 'Nenhuma dimensão ou métrica especificada',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Construir SQL seguro
    const selectFields: string[] = [];
    const groupByFields: string[] = [];

    // Adicionar dimensões
    dims.forEach((dim, index) => {
      selectFields.push(`t."${dim.field}" AS "${dim.alias}"`);
      groupByFields.push(`${index + 1}`); // GROUP BY por posição
    });

    // Adicionar métricas
    metrics.forEach((metric) => {
      const aggFunction = mapAggregation(metric.agg, metric.field);
      selectFields.push(`${aggFunction} AS "${metric.alias}"`);
    });

    const selectClause = selectFields.join(', ');
    const groupByClause = groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : '';
    
    // Limitar offset e limit
    const safeLimit = Math.min(Math.max(1, limit), 5000);
    const safeOffset = Math.max(0, offset);

    const finalSQL = `
      SELECT ${selectClause}
      FROM (${dataset.sql_query}) AS t
      ${groupByClause}
      ORDER BY 1
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `.trim();

    console.log('Generated SQL:', finalSQL);

    // Executar consulta usando a função run-sql-query
    const { data: queryResult, error: queryError } = await supabase.functions.invoke('run-sql-query', {
      body: {
        connection_id: dataset.connection_id,
        query: finalSQL,
        limit: safeLimit
      }
    });

    if (queryError) {
      console.error('Query execution error:', queryError);
      return successResponse({
        error_code: 'QUERY_FAILED',
        message: queryError.message || 'Falha ao executar consulta',
        elapsed_ms: Date.now() - startTime
      });
    }

    // Retornar resultado padronizado
    return successResponse({
      columns: queryResult.columns || [],
      rows: queryResult.rows || [],
      truncated: queryResult.truncated || false,
      elapsed_ms: Date.now() - startTime
    });

  } catch (error: any) {
    console.error('Charts run error:', error);
    return successResponse({
      error_code: 'INTERNAL_ERROR',
      message: error.message || 'Erro interno do servidor',
      elapsed_ms: Date.now() - startTime
    });
  }
});