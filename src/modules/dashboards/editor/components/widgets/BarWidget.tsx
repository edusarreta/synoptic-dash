import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Widget } from '../../state/editorStore';

interface BarWidgetProps {
  widget: Widget;
}

export default function BarWidget({ widget }: BarWidgetProps) {
  useWidgetData(widget.id);

  if (widget.loading) {
    return (
      <div className="p-4 text-muted-foreground flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
        Carregando…
      </div>
    );
  }

  if (widget.error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        Erro: {widget.error}
      </div>
    );
  }

  if (!widget.data?.rows?.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        <div className="space-y-2">
          <div>Sem dados disponíveis</div>
          {(widget.query.dims.length === 0 && widget.query.mets.length === 0) && (
            <div className="text-xs">Adicione dimensões e métricas para visualizar dados</div>
          )}
        </div>
      </div>
    );
  }

  const xAxisKey = widget.query.dims[0]?.field;
  const metrics = widget.query.mets;

  if (!xAxisKey || !metrics.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        Configure pelo menos 1 dimensão e 1 métrica
      </div>
    );
  }

  // Handle column names - support both old string[] format and new object format
  const columnNames = Array.isArray(widget.data.columns) 
    ? (typeof widget.data.columns[0] === 'string' 
        ? widget.data.columns as string[]
        : (widget.data.columns as Array<{ name: string; type: string }>).map(col => col.name))
    : [];

  // Debug widget data
  console.log('🔍 BarWidget Debug:', {
    widgetId: widget.id,
    hasData: !!widget.data,
    columns: widget.data?.columns,
    columnNames,
    rowsCount: widget.data?.rows?.length,
    firstRow: widget.data?.rows?.[0],
    xAxisKey,
    metrics
  });

  // Transform data for Recharts - convert array format to object format
  const chartData = widget.data.rows.slice(0, 50).map((row, index) => {
    const item: Record<string, any> = {};
    columnNames.forEach((col, colIndex) => {
      item[col] = row[colIndex];
    });
    return item;
  });

  console.log('📊 BarWidget chartData:', chartData);

  return (
    <div className="min-h-[260px] h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs fill-muted-foreground"
            interval="preserveStartEnd"
          />
          <YAxis className="text-xs fill-muted-foreground" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          {metrics.map((metric, index) => {
            // Use actual column name from API response instead of constructed alias
            const dataKey = columnNames.find(col => 
              col.includes(metric.field) && col.includes(metric.agg || 'sum')
            ) || `${metric.field}_${metric.agg || 'sum'}`;
            
            console.log(`🎯 BarWidget metric ${index}:`, {
              metric,
              columnNames,
              foundDataKey: dataKey,
              searchPattern: `${metric.field} + ${metric.agg || 'sum'}`
            });
            
            return (
              <Bar
                key={dataKey}
                dataKey={dataKey}
                fill={`hsl(${200 + index * 30}, 70%, 50%)`}
                name={`${metric.agg || 'sum'}(${metric.field})`}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}