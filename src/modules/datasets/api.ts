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

export async function chartsRun(payload: ChartsRunPayload): Promise<ChartsRunResponse> {
  console.log('=== CHARTS RUN API ===');
  console.log('Payload:', payload);
  
  const { data, error } = await supabase.functions.invoke('charts-run', {
    body: payload
  });

  if (error) {
    console.error('Charts run error:', error);
    throw new Error(error.message || 'Falha ao executar consulta');
  }

  // Check if response has error_code (structured error) or explicit error status
  if (data?.error_code || data?.ok === false || data?.success === false) {
    console.error('Charts run structured error:', data);
    throw new Error(data?.message || 'Falha ao executar consulta');
  }

  console.log('Charts run response:', data);
  return data;
}

export async function getDatasetsPreview(dataset_id: string, org_id: string, workspace_id?: string) {
  console.log('Getting dataset preview for:', { dataset_id, org_id, workspace_id });
  
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
    console.error('Dataset preview error:', error);
    throw new Error(error.message || 'Falha ao obter preview do dataset');
  }

  if (data?.error_code) {
    console.error('Dataset preview structured error:', data);
    throw new Error(`${data.message} (${data.error_code})`);
  }

  return data;
}