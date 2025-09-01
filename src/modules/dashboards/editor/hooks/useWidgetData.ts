import { useEffect } from 'react';
import { buildSqlFromSpec } from '../utils/buildSqlFromSpec';
import { useEditorStore } from '../state/editorStore';
import { runSqlPreview } from '@/modules/sql/api/runSqlPreview';

export function useWidgetData(widgetId: string) {
  const { getWidget, updateWidget } = useEditorStore();
  const widget = getWidget(widgetId);

  useEffect(() => {
    if (!widget?.query?.connectionId) return;
    if (!widget.query.dims.length && !widget.query.mets.length) return;

    const { sql } = buildSqlFromSpec(widget);
    
    updateWidget(widgetId, { loading: true, error: null });

    runSqlPreview({
      connectionId: widget.query.connectionId,
      sql,
      rowLimit: 5000,
      timeoutMs: 15000,
    })
    .then(res => {
      updateWidget(widgetId, { 
        data: { 
          columns: res.columns, 
          rows: res.rows, 
          truncated: res.truncated 
        }, 
        loading: false 
      });
    })
    .catch(err => {
      updateWidget(widgetId, { 
        error: err?.message ?? 'Falha ao obter dados', 
        loading: false 
      });
    });
  }, [
    widgetId, 
    widget?.query?.connectionId,
    JSON.stringify(widget?.query?.dims),
    JSON.stringify(widget?.query?.mets),
    JSON.stringify(widget?.query?.source)
  ]);
}