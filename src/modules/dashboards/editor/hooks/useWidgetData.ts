import { useEffect } from 'react';
import { useEditorStore } from '../state/editorStore';
import { useSession } from '@/providers/SessionProvider';
import { ChartDataService } from '@/modules/charts/chartDataService';

export function useWidgetData(widgetId: string) {
  const { getWidget, updateWidget } = useEditorStore();
  const { userProfile } = useSession();
  const widget = getWidget(widgetId);

  useEffect(() => {
    async function fetchData() {
      if (!widget?.query) {
        console.log('🚫 No widget query, skipping data fetch');
        return;
      }
      
      if (!widget.query.dims.length && !widget.query.mets.length) {
        console.log('🚫 No dimensions or metrics, skipping data fetch');
        return;
      }

      if (!userProfile?.org_id) {
        console.error('🚫 No org_id found in user profile');
        updateWidget(widgetId, { 
          error: 'org_id não encontrado no perfil do usuário', 
          loading: false 
        });
        return;
      }

      console.log('🎯 useWidgetData: Starting fetch for widget:', widgetId);
      console.log('📊 Widget query:', { 
        source: widget.query.source, 
        dims: widget.query.dims.length,
        mets: widget.query.mets.length 
      });

      updateWidget(widgetId, { loading: true, error: null });

      try {
        // Only handle dataset source for now (most common case)
        if (widget.query.source.kind === 'dataset' && widget.query.source.datasetId) {
          console.log('📈 Fetching data for dataset source:', widget.query.source.datasetId);
          
          // Prepare dimensions and metrics
          const dims = widget.query.dims.map(dim => ({
            field: dim.field,
            alias: dim.field
          }));

          const metrics = widget.query.mets.map(met => ({
            field: met.field,
            agg: met.agg || 'sum',
            alias: `${met.field}_${met.agg || 'sum'}`
          }));

          console.log('📋 Prepared request:', { 
            org_id: userProfile.org_id,
            dataset_id: widget.query.source.datasetId,
            dims,
            metrics 
          });

          // Use the new chart data service
          const data = await ChartDataService.loadChartData({
            org_id: userProfile.org_id,
            dataset_id: widget.query.source.datasetId,
            dims,
            metrics,
            limit: 1000,
            offset: 0
          });

          console.log('✅ Chart data loaded successfully:', { 
            columns: data.columns?.length || 0, 
            rows: data.rows?.length || 0,
            truncated: data.truncated
          });

          updateWidget(widgetId, { 
            data: { 
              columns: data.columns || [], 
              rows: data.rows || [], 
              truncated: data.truncated || false 
            }, 
            loading: false 
          });

        } else {
          console.warn('⚠️ Unsupported query source type:', widget.query.source);
          updateWidget(widgetId, { 
            error: 'Tipo de fonte de dados não suportado', 
            loading: false 
          });
        }

      } catch (err: any) {
        console.error('❌ Widget data fetch error:', err);
        updateWidget(widgetId, { 
          error: err?.message ?? 'Falha ao obter dados', 
          loading: false 
        });
      }
    }

    fetchData();
  }, [
    widgetId, 
    widget?.query?.source?.datasetId,
    JSON.stringify(widget?.query?.dims),
    JSON.stringify(widget?.query?.mets),
    userProfile?.org_id
  ]);
}