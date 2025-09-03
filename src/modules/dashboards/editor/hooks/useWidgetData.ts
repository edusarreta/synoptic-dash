import { useEffect } from 'react';
import { buildSqlFromSpec } from '../utils/buildSqlFromSpec';
import { useEditorStore } from '../state/editorStore';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';

export function useWidgetData(widgetId: string) {
  const { getWidget, updateWidget } = useEditorStore();
  const { userProfile } = useSession();
  const widget = getWidget(widgetId);

  useEffect(() => {
    async function fetchData() {
      if (!widget?.query) return;
      if (!widget.query.dims.length && !widget.query.mets.length) return;

      updateWidget(widgetId, { loading: true, error: null });

      try {
        // If using dataset source, use the new charts-run function
        if (widget.query.source.kind === 'dataset' && widget.query.source.datasetId) {
          console.log('=== WIDGET DATA FETCH DEBUG ===');
          console.log('Fetching widget data for dataset:', widget.query.source.datasetId);
          console.log('User org_id:', userProfile?.org_id, 'type:', typeof userProfile?.org_id);
          
          // Prepare dimensions and metrics for charts-run
          const dims = widget.query.dims.map(dim => ({
            field: dim.field,
            alias: dim.field
          }));

          const metrics = widget.query.mets.map(met => ({
            field: met.field,
            agg: met.agg || 'sum',
            alias: `${met.field}_${met.agg || 'sum'}`
          }));

          console.log('Charts run payload:', { dims, metrics });

          // Validate required data before making request
          if (!userProfile?.org_id) {
            throw new Error('org_id não encontrado no perfil do usuário');
          }

          console.log('Final payload being sent:', {
            org_id: userProfile.org_id,
            dataset_id: widget.query.source.datasetId,
            dims,
            metrics
          });

          // Use new charts-run API function
          const { chartsRun } = await import('@/modules/datasets/api');
          
          const data = await chartsRun({
            org_id: userProfile.org_id,
            dataset_id: widget.query.source.datasetId,
            dims,
            metrics,
            limit: 1000,
            offset: 0
          });

          console.log('Widget data loaded:', { columns: data.columns?.length, rows: data.rows?.length });

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
              connection_id: widget.query.connectionId,
              query: sql,
              limit: widget.query.limit || 1000
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