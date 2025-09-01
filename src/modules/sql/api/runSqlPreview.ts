import { supabase } from '@/integrations/supabase/client';

export async function runSqlPreview({
  connectionId,
  sql,
  rowLimit = 1000,
  timeoutMs = 15000
}: {
  connectionId: string;
  sql: string;
  rowLimit?: number;
  timeoutMs?: number;
}) {
  const { data, error } = await supabase.functions.invoke('run-sql-query', {
    body: {
      mode: 'preview',
      connection_id: connectionId,
      sql,
      row_limit: rowLimit,
      timeout_ms: timeoutMs,
    }
  });

  if (error) {
    throw new Error(error.message || 'Falha ao executar consulta SQL');
  }

  if (!data || data.error) {
    throw new Error(data?.error || 'Erro desconhecido na consulta SQL');
  }

  return {
    columns: data.columns || [],
    rows: data.rows || [],
    truncated: data.truncated || false
  };
}