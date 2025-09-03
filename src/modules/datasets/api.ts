import { supabase } from '@/integrations/supabase/client';

export interface ChartsRunPayload {
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

export interface ChartsRunResponse {
  columns: Array<{ name: string; type: string }>;
  rows: any[][];
  truncated: boolean;
  elapsed_ms: number;
  error_code?: string;
  message?: string;
}

/**
 * Executa consulta de dados para charts com fallback robusto
 */
export async function chartsRun(payload: ChartsRunPayload): Promise<ChartsRunResponse> {
  console.log('📊 Charts Run API - Starting request');
  console.log('📋 Payload:', {
    org_id: payload.org_id,
    dataset_id: payload.dataset_id,
    dims_count: payload.dims.length,
    metrics_count: payload.metrics.length
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('charts-run', {
      body: payload
    });

    console.log('📡 Charts-run response:', { 
      success: !error, 
      hasData: !!data,
      hasColumns: !!data?.columns,
      error: error?.message,
      data_error_code: data?.error_code,
      data_success: data?.success 
    });

    if (error) {
      console.error('❌ Charts run supabase error:', error);
      throw new Error(error.message || 'Falha ao executar consulta');
    }

    // Check for structured errors in response
    if (data?.error_code || data?.ok === false || data?.success === false) {
      console.error('❌ Charts run structured error:', data);
      throw new Error(data?.message || 'Falha ao executar consulta');
    }

    // Validate response structure
    if (!data || !data.columns || !Array.isArray(data.columns)) {
      console.error('❌ Invalid response structure:', data);
      throw new Error('Resposta inválida da consulta');
    }

    console.log('✅ Charts run successful:', {
      columns: data.columns.length,
      rows: data.rows?.length || 0,
      elapsed_ms: data.elapsed_ms
    });

    return {
      columns: data.columns,
      rows: data.rows || [],
      truncated: data.truncated || false,
      elapsed_ms: data.elapsed_ms || 0
    };

  } catch (err) {
    console.error('💥 Charts run failed completely:', err);
    throw err;
  }
}

/**
 * Obtém preview de dataset com validação robusta
 */
export async function getDatasetsPreview(dataset_id: string, org_id: string, workspace_id?: string) {
  console.log('🔍 Getting dataset preview for:', { dataset_id, org_id, workspace_id });
  
  try {
    const { data, error } = await supabase.functions.invoke('datasets-preview', {
      body: {
        dataset_id,
        org_id,
        workspace_id,
        limit: 100,
        offset: 0
      }
    });

    if (error) {
      console.error('❌ Dataset preview error:', error);
      throw new Error(error.message || 'Falha ao obter preview do dataset');
    }

    if (data?.error_code) {
      console.error('❌ Dataset preview structured error:', data);
      throw new Error(`${data.message} (${data.error_code})`);
    }

    console.log('✅ Dataset preview successful:', {
      columns: data?.columns?.length || 0,
      rows: data?.rows?.length || 0,
      dataset_name: data?.dataset?.name
    });

    return data;

  } catch (err) {
    console.error('💥 Dataset preview failed:', err);
    throw err;
  }
}