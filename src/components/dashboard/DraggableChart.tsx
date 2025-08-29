import { Card } from "@/components/ui/card";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DraggableChartProps {
  chart: any;
  onToggleFullscreen?: (chartId: string) => void;
  isFullscreen?: boolean;
}

export function DraggableChart({ chart, onToggleFullscreen, isFullscreen }: DraggableChartProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Card 
      className={`
        group relative h-full transition-all duration-200 
        ${isDragging ? 'rotate-1 scale-105 shadow-2xl z-50' : 'hover:shadow-lg'}
        ${isFullscreen ? 'fixed inset-4 z-50 m-0' : ''}
        bg-background border-border
      `}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md p-1 border">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
          {onToggleFullscreen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen(chart.id);
              }}
              className="h-6 w-6 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <ChartRenderer
        config={{
          type: chart.chart_type,
          title: chart.name,
          description: chart.description,
          xAxis: chart.chart_config?.xAxis || '',
          yAxis: chart.chart_config?.yAxis || [],
          data: chart.data || []
        }}
        className="h-full"
      />

      {/* Resize Handles */}
      <div className="absolute bottom-0 right-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-full h-full bg-gradient-to-tl from-primary/20 to-transparent rounded-tl-lg cursor-se-resize">
          <div className="absolute bottom-1 right-1 w-2 h-2 bg-primary/40 rounded-full"></div>
        </div>
      </div>
    </Card>
  );
}