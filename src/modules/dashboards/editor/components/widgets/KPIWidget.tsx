import React from 'react';
import { Widget } from '../../state/editorStore';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface KPIWidgetProps {
  widget: Widget;
}

export default function KPIWidget({ widget }: KPIWidgetProps) {
  useWidgetData(widget.id);

  if (widget.loading) {
    return (
      <Card className="h-full min-h-[260px]">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (widget.error) {
    return (
      <Card className="h-full min-h-[260px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-destructive">
            <p className="text-sm">Erro: {widget.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!widget.data || !widget.data.rows.length) {
    return (
      <Card className="h-full min-h-[260px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For KPI, we expect 0 dimensions and 1 metric
  const metrics = widget.query.mets;
  if (metrics.length === 0) {
    return (
      <Card className="h-full min-h-[260px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Configure 1 métrica para KPI</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle column names - support both old string[] format and new object format
  const columnNames = Array.isArray(widget.data.columns) 
    ? (typeof widget.data.columns[0] === 'string' 
        ? widget.data.columns as string[]
        : (widget.data.columns as Array<{ name: string; type: string }>).map(col => col.name))
    : [];

  const metric = metrics[0];
  // Use actual column name from API response instead of constructed alias
  const metricColumnName = columnNames.find(col => 
    col.includes(metric.field) && col.includes(metric.agg || 'sum')
  ) || `${metric.field}_${metric.agg || 'sum'}`;
  
  // Get the value - find the column index and use it
  const columnIndex = columnNames.indexOf(metricColumnName);
  const value = columnIndex >= 0 ? widget.data.rows[0]?.[columnIndex] : widget.data.rows[0]?.[widget.query.dims.length] || 0;
  
  // Format the value
  const formatValue = (val: any): string => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(val);
    }
    return String(val || 0);
  };

  return (
    <Card className="h-full min-h-[260px]">
      <CardContent className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center space-y-4">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {metricColumnName.replace(/_/g, ' ')}
          </div>
          <div className="text-4xl font-bold text-primary">
            {formatValue(value)}
          </div>
          {typeof value === 'number' && value > 0 && (
            <div className="flex items-center justify-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Valor positivo</span>
            </div>
          )}
          {typeof value === 'number' && value < 0 && (
            <div className="flex items-center justify-center text-sm text-red-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span>Valor negativo</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}