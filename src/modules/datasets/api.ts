import { supabase } from '@/integrations/supabase/client';

export interface ChartsRunPayload {
  org_id: string;
  workspace_id?: string;
  dataset_id: string;
  spec: {
    chart: 'table' | 'bar' | 'line' | 'area' | 'pie' | 'kpi';
    dims: Array<{ field: string; time_grain?: 'day' | 'month' | 'year' }>;
    metrics: Array<{ field: string; agg: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct' }>;
    where?: Array<any>;
    orderBy?: Array<{ field: string; dir: 'asc' | 'desc' }>;
    limit?: number;
  };
}

export interface ChartsRunResponse {
  columns: Array<{ name: string; type: string }>;
  rows: any[][];
  truncated: boolean;
  elapsed_ms: number;
  code?: string;
  message?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  connection_id: string;
  kind: 'sql' | 'rest';
  sql?: string;
  params?: any;
  columns: Array<{ name: string; type: string }>;
  created_at: string;
  type?: 'dataset' | 'saved_query';
  source_type?: string;
  sql_query?: string;
}

/**
 * Get list of datasets for an organization
 */
export async function getDatasetsList(org_id: string, workspace_id?: string): Promise<{ items: Dataset[]; total: number }> {
  console.log('🔍 Getting datasets list for org:', org_id);
  
  try {
    const { data, error } = await supabase.functions.invoke('datasets-list', {
      body: { org_id, workspace_id }
    });

    if (error) {
      console.error('❌ Datasets list error:', error);
      throw new Error(error.message || 'Failed to fetch datasets');
    }

    if (data?.code) {
      console.error('❌ Datasets list structured error:', data);
      throw new Error(`${data.message} (${data.code})`);
    }

    console.log('✅ Datasets list successful:', data?.total || 0, 'items');
    return data || { items: [], total: 0 };

  } catch (err) {
    console.error('💥 Datasets list failed:', err);
    throw err;
  }
}

/**
 * Get specific dataset details
 */
export async function getDataset(dataset_id: string, org_id: string, workspace_id?: string): Promise<Dataset> {
  console.log('🔍 Getting dataset details for:', dataset_id);
  
  try {
    const { data, error } = await supabase.functions.invoke('datasets-get', {
      body: { org_id, workspace_id, dataset_id }
    });

    if (error) {
      console.error('❌ Dataset get error:', error);
      throw new Error(error.message || 'Failed to fetch dataset');
    }

    if (data?.code) {
      console.error('❌ Dataset get structured error:', data);
      if (data.code === 'DATASET_NOT_FOUND') {
        throw new Error('Dataset não encontrado ou sem acesso');
      }
      throw new Error(`${data.message} (${data.code})`);
    }

    console.log('✅ Dataset get successful:', data?.name);
    return data;

  } catch (err) {
    console.error('💥 Dataset get failed:', err);
    throw err;
  }
}

/**
 * Run widget query with robust data aggregation
 */
export async function runWidgetQuery(payload: ChartsRunPayload): Promise<ChartsRunResponse> {
  console.log('📊 Running widget query');
  console.log('📋 Payload:', {
    org_id: payload.org_id,
    dataset_id: payload.dataset_id,
    dims_count: payload.spec.dims.length,
    metrics_count: payload.spec.metrics.length
  });
  
  try {
    // Temporarily use charts-run while widgets-run is being fixed
    const payload_charts = {
      org_id: payload.org_id,
      dataset_id: payload.dataset_id,
      dims: payload.spec.dims.map(dim => ({ field: dim.field, alias: dim.field })),
      metrics: payload.spec.metrics.map(met => ({ 
        field: met.field, 
        agg: met.agg, 
        alias: `${met.field}_${met.agg}` 
      })),
      limit: payload.spec.limit || 1000,
      offset: 0
    };
    
    const { data, error } = await supabase.functions.invoke('charts-run', {
      body: payload_charts
    });

    console.log('📡 Widget run response:', { 
      success: !error, 
      hasData: !!data,
      hasColumns: !!data?.columns,
      error: error?.message,
      data_code: data?.code
    });

    if (error) {
      console.error('❌ Widget run supabase error:', error);
      throw new Error(error.message || 'Falha ao executar consulta');
    }

    // Check for structured errors in response
    if (data?.error_code || data?.ok === false || data?.success === false) {
      console.error('❌ Widget run structured error:', data);
      
      // Handle specific error codes
      switch (data.error_code || data.code) {
        case 'DATASET_NOT_FOUND':
          throw new Error('Dataset não encontrado ou sem acesso');
        case 'ONLY_SELECT_ALLOWED':
          throw new Error('Apenas SELECT é permitido no dataset base');
        case 'NO_FIELDS':
          throw new Error('Nenhuma dimensão ou métrica especificada');
        case 'QUERY_FAILED':
          throw new Error(data.message || 'Falha ao executar consulta');
        default:
          throw new Error(data.message || 'Falha ao executar consulta');
      }
    }

    // Validate response structure
    if (!data || !data.columns || !Array.isArray(data.columns)) {
      console.error('❌ Invalid response structure:', data);
      throw new Error('Resposta inválida da consulta');
    }

    console.log('✅ Widget run successful:', {
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
    console.error('💥 Widget run failed completely:', err);
    throw err;
  }
}

/**
 * Get dataset preview with standardized format
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

    if (data?.code) {
      console.error('❌ Dataset preview structured error:', data);
      if (data.code === 'DATASET_NOT_FOUND') {
        throw new Error('Dataset não encontrado ou sem acesso');
      }
      throw new Error(`${data.message} (${data.code})`);
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