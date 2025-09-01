import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Widget } from '../../state/editorStore';

interface LineWidgetProps {
  widget: Widget;
}

export default function LineWidget({ widget }: LineWidgetProps) {
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
        Sem dados disponíveis
      </div>
    );
  }

  const data = widget.data.rows.slice(0, 50); // Limit for performance
  const xAxisKey = widget.query.dims[0]?.field;
  const metrics = widget.query.mets;

  if (!xAxisKey || !metrics.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        Configure pelo menos 1 dimensão e 1 métrica
      </div>
    );
  }

  return (
    <div className="h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
          {metrics.map((metric, index) => (
            <Line
              key={metric.alias || `${metric.agg}_${metric.field}`}
              type="monotone"
              dataKey={metric.alias || `${metric.agg}_${metric.field}`}
              stroke={`hsl(${200 + index * 30}, 70%, 50%)`}
              strokeWidth={2}
              name={metric.alias || `${metric.agg}(${metric.field})`}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}