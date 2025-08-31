import React from 'react';
import { ChartItem, useEditorStore } from '../store/editorStore';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Lock, 
  Unlock, 
  Copy, 
  Trash2,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChartWidgetProps {
  chart: ChartItem;
}

const chartIcons = {
  table: Table,
  bar: BarChart3,
  line: LineChart,
  area: TrendingUp,
  timeseries: Activity,
  pie: PieChart,
  kpi: Activity
};

export function ChartWidget({ chart }: ChartWidgetProps) {
  const { removeChart, duplicateChart, lockChart } = useEditorStore();
  
  const Icon = chartIcons[chart.type];

  const handleMenuAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    switch (action) {
      case 'duplicate':
        duplicateChart(chart.id);
        break;
      case 'lock':
        lockChart(chart.id, !chart.locked);
        break;
      case 'delete':
        removeChart(chart.id);
        break;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm truncate">{chart.title}</span>
          {chart.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => handleMenuAction('duplicate', e)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleMenuAction('lock', e)}>
              {chart.locked ? (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Destravar
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Travar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => handleMenuAction('delete', e)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex items-center justify-center">
        {chart.datasetId ? (
          <div className="text-center space-y-2">
            <Icon className="w-8 h-8 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center mx-auto">
              <Icon className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="text-xs text-muted-foreground">
              Conecte uma fonte de dados
            </div>
          </div>
        )}
      </div>
    </div>
  );
}