import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Widget } from '../../state/editorStore';

interface PieWidgetProps {
  widget: Widget;
}

export default function PieWidget({ widget }: PieWidgetProps) {
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

  const data = widget.data.rows.slice(0, 10); // Limit for performance
  const nameKey = widget.query.dims[0]?.field;
  const valueKey = widget.query.mets[0]?.alias || `${widget.query.mets[0]?.agg}_${widget.query.mets[0]?.field}`;

  if (!nameKey || !widget.query.mets.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        Configure pelo menos 1 dimensão e 1 métrica
      </div>
    );
  }

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="min-h-[260px] h-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={valueKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}