import { useRef, useState, useEffect } from "react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Trash2, BarChart3, Filter as FilterIcon, TrendingUp, GripVertical, Maximize2 } from "lucide-react";
import { 
  Chart, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  BarController,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: any;
  layout: { x: number; y: number; w: number; h: number };
  style?: any;
}

interface DraggableWidgetProps {
  widget: Widget;
  isSelected: boolean;
  onSelect: (id: number | null) => void;
  onUpdate: (id: number, updates: Partial<Widget>) => void;
  onRemove: (id: number) => void;
  processData: (widget: Widget) => any;
}

export function DraggableWidget({
  widget,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  processData
}: DraggableWidgetProps) {
  const chartRef = useRef<Chart | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    data: {
      type: 'widget',
      widget
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `${widget.layout.x} / span ${widget.layout.w}`,
    gridRow: `${widget.layout.y} / span ${widget.layout.h}`,
    opacity: isDragging ? 0.5 : 1,
  };

  const data = processData(widget);

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: widget.layout.w,
      h: widget.layout.h
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Convert pixel delta to grid units (approximate)
      const gridCellWidth = 84; // (1200px - 11*16px gaps) / 12 columns
      const gridCellHeight = 60;
      
      const newW = Math.max(1, resizeStart.w + Math.round(deltaX / gridCellWidth));
      const newH = Math.max(1, resizeStart.h + Math.round(deltaY / gridCellHeight));

      onUpdate(widget.id, {
        layout: { ...widget.layout, w: newW, h: newH }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, widget.id, widget.layout, onUpdate]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative bg-card border rounded-lg shadow-sm overflow-hidden transition-all
        ${isSelected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/50'}
        ${isDragging ? 'z-50' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(widget.id);
      }}
    >
      {/* Drag Handle and Controls (visible when selected) */}
      {isSelected && (
        <div className="absolute -top-10 left-0 flex items-center gap-2 bg-card border rounded px-2 py-1 shadow-sm z-10">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex items-center gap-1 px-1"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
            {widget.type === 'scorecard' && <TrendingUp className="w-3 h-3" />}
            {widget.type === 'bar' && <BarChart3 className="w-3 h-3" />}
            {widget.type === 'filter' && <FilterIcon className="w-3 h-3" />}
            <span className="text-xs font-medium capitalize">{widget.type}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widget.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Resize Handle (visible when selected) */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary/20 hover:bg-primary/40 transition-colors"
          onMouseDown={handleResizeStart}
        >
          <Maximize2 className="w-3 h-3 text-primary m-0.5" />
        </div>
      )}

      {/* Widget Content */}
      <div className="w-full h-full p-4 flex flex-col">
        {widget.type === 'scorecard' && (
          <div className="flex flex-col justify-center h-full">
            <p className="text-sm text-muted-foreground mb-2">{data.label || 'Métrica'}</p>
            <p className="text-4xl font-bold text-foreground">
              {data.value ? data.value.toLocaleString('pt-BR') : '0'}
            </p>
          </div>
        )}

        {widget.type === 'bar' && (
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-medium mb-2">
              {(() => {
                const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                                 widget.config.dimension ? [widget.config.dimension] : [];
                const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                               widget.config.metric ? [widget.config.metric] : [];
                
                if (metrics.length > 0 && dimensions.length > 0) {
                  const firstMetric = metrics[0].split('.')[1] || metrics[0];
                  const firstDimension = dimensions[0].split('.')[1] || dimensions[0];
                  return `${firstMetric} por ${firstDimension}`;
                }
                return 'Gráfico de Barras';
              })()}
            </h3>
            <div className="flex-1 relative">
              <canvas
                ref={(canvas) => {
                  if (canvas && data.labels && data.values) {
                    // Clear existing chart
                    if (chartRef.current) {
                      chartRef.current.destroy();
                    }

                    // Create new chart
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      const chartConfig = {
                        type: 'bar' as const,
                        data: {
                          labels: data.labels,
                          datasets: data.datasets || [{
                            label: data.metricLabel || 'Valor',
                            data: data.values,
                            backgroundColor: 'hsl(var(--primary))',
                            borderRadius: 4
                          }]
                        },
                        options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { 
                              display: data.datasets && data.datasets.length > 1,
                              position: 'top' as const
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }
                      };
                      
                      try {
                        chartRef.current = new Chart(ctx, chartConfig);
                      } catch (error) {
                        console.error('Chart creation error:', error);
                      }
                    }
                  }
                }}
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {widget.type === 'filter' && (
          <div className="flex flex-col h-full">
            <label className="text-sm font-medium mb-2 text-muted-foreground">
              {data.fieldName || 'Selecione um Campo'}
            </label>
            <select className="w-full p-2 border border-input rounded-md text-sm bg-background">
              <option value="">Todos</option>
              {data.options && data.options.map((option: string, index: number) => (
                <option key={index} value={option.toLowerCase().replace(/ /g, '_')}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {(() => {
          const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                           widget.config.dimension ? [widget.config.dimension] : [];
          const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                         widget.config.metric ? [widget.config.metric] : [];
          
          const hasConfiguration = dimensions.length > 0 || metrics.length > 0;
          
          if (!hasConfiguration && widget.type !== 'filter') {
            return (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3 mx-auto">
                    {widget.type === 'scorecard' && <TrendingUp className="w-6 h-6 text-muted-foreground" />}
                    {widget.type === 'bar' && <BarChart3 className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <h3 className="font-medium text-sm mb-1">Configurar {widget.type}</h3>
                  <p className="text-xs text-muted-foreground">
                    Arraste campos do painel de dados
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}