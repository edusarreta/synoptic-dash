import { useEffect } from 'react';
import { buildSqlFromSpec } from '../utils/buildSqlFromSpec';
import { useEditorStore } from '../state/editorStore';
import { supabase } from '@/integrations/supabase/client';

export function useWidgetData(widgetId: string) {
  const { getWidget, updateWidget, getDataset } = useEditorStore();
  const widget = getWidget(widgetId);

  useEffect(() => {
    async function fetchData() {
      if (!widget?.query) return;
      if (!widget.query.dims.length && !widget.query.mets.length) return;

      updateWidget(widgetId, { loading: true, error: null });

      try {
        // If using dataset source, get dataset SQL first
        if (widget.query.source.kind === 'dataset' && widget.query.source.datasetId) {
          const dataset = getDataset(widget.query.source.datasetId);
          if (!dataset) {
            throw new Error('Dataset não encontrado');
          }
          
          // Use dataset preview for data
          const { data, error } = await supabase.functions.invoke('datasets-preview', {
            body: {
              dataset_id: widget.query.source.datasetId,
              limit: 5000,
              offset: 0
            }
          });

          if (error) {
            throw new Error(error.message || 'Falha ao carregar dados do dataset');
          }

          updateWidget(widgetId, { 
            data: { 
              columns: data.columns || [], 
              rows: data.rows || [], 
              truncated: data.truncated || false 
            }, 
            loading: false 
          });
        } else {
          // Legacy direct SQL execution - build SQL from spec
          const { sql } = buildSqlFromSpec(widget);
          
          const { data, error } = await supabase.functions.invoke('run-sql-query', {
            body: {
              org_id: widget.query.connectionId, // This needs to be fixed to use proper org_id
              connection_id: widget.query.connectionId,
              sql,
              mode: 'preview',
              row_limit: 5000,
              timeout_ms: 15000,
            }
          });

          if (error) {
            throw new Error(error.message || 'Falha ao executar consulta');
          }

          updateWidget(widgetId, { 
            data: { 
              columns: data.columns || [], 
              rows: data.rows || [], 
              truncated: data.truncated || false 
            }, 
            loading: false 
          });
        }
      } catch (err: any) {
        console.error('Widget data fetch error:', err);
        updateWidget(widgetId, { 
          error: err?.message ?? 'Falha ao obter dados', 
          loading: false 
        });
      }
    }

    fetchData();
  }, [
    widgetId, 
    widget?.query?.connectionId,
    widget?.query?.source?.datasetId,
    JSON.stringify(widget?.query?.dims),
    JSON.stringify(widget?.query?.mets),
    JSON.stringify(widget?.query?.source)
  ]);
}