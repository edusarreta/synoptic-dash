import { useRef, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Trash2, BarChart3, Filter as FilterIcon, TrendingUp } from "lucide-react";

// Register Chart.js components including BarController
Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: any;
  layout: { x: number; y: number; w: number; h: number };
  style?: any;
}

interface LookerCanvasGridProps {
  widgets: Widget[];
  selectedWidgetId: number | null;
  onWidgetSelect: (id: number | null) => void;
  onWidgetUpdate: (id: number, updates: Partial<Widget>) => void;
  onWidgetRemove: (id: number) => void;
  processDataForWidget: (widget: Widget) => any;
}

export function LookerCanvasGrid({
  widgets,
  selectedWidgetId,
  onWidgetSelect,
  onWidgetUpdate,
  onWidgetRemove,
  processDataForWidget
}: LookerCanvasGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const chartRefs = useRef<{ [key: number]: any }>({});

  useEffect(() => {
    // Cleanup charts on unmount
    return () => {
      Object.values(chartRefs.current).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
    };
  }, []);

  const renderWidget = (widget: Widget) => {
    const isSelected = selectedWidgetId === widget.id;
    const data = processDataForWidget(widget);

    return (
      <div
        key={widget.id}
        className={`
          canvas-item relative bg-card border rounded-lg shadow-sm overflow-hidden transition-all cursor-move
          ${isSelected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground/50'}
        `}
        style={{
          gridColumn: `${widget.layout.x} / span ${widget.layout.w}`,
          gridRow: `${widget.layout.y} / span ${widget.layout.h}`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onWidgetSelect(widget.id);
        }}
      >
        {/* Widget Header (visible when selected) */}
        {isSelected && (
          <div className="absolute -top-10 left-0 flex items-center gap-2 bg-card border rounded px-2 py-1 shadow-sm z-10">
            <div className="flex items-center gap-1">
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
                onWidgetRemove(widget.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
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
                {data.metricLabel ? `${data.metricLabel} por ${widget.config.dimension}` : 'Gráfico de Barras'}
              </h3>
              <div className="flex-1 relative">
                <canvas
                  ref={(canvas) => {
                    if (canvas && data.labels && data.values) {
                      // Clear existing chart
                      if (chartRefs.current[widget.id]) {
                        chartRefs.current[widget.id].destroy();
                      }

                      // Create new chart
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        chartRefs.current[widget.id] = new Chart(ctx, {
                          type: 'bar',
                          data: {
                            labels: data.labels,
                            datasets: [{
                              label: data.metricLabel,
                              data: data.values,
                              backgroundColor: 'hsl(var(--primary))',
                              borderRadius: 4
                            }]
                          },
                          options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false }
                            },
                            scales: {
                              y: {
                                beginAtZero: true
                              }
                            }
                          }
                        });
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
                {widget.config.dimension ? 
                  widget.config.dimension.charAt(0).toUpperCase() + widget.config.dimension.slice(1) : 
                  'Selecione um Campo'
                }
              </label>
              <select className="w-full p-2 border border-input rounded-md text-sm bg-background">
                <option value="">Todos</option>
                {/* Mock options - in real implementation, these would be dynamic */}
                <option value="brasil">Brasil</option>
                <option value="eua">EUA</option>
                <option value="alemanha">Alemanha</option>
              </select>
            </div>
          )}

          {!widget.config.dimension && !widget.config.metric && widget.type !== 'filter' && (
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
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar">
      <div
        ref={canvasRef}
        id="canvas"
        className="w-[1200px] h-full mx-auto bg-card shadow-lg"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridAutoRows: '60px',
          gap: '16px',
          padding: '16px',
          minHeight: '100%',
          alignContent: 'start'
        }}
        onClick={() => onWidgetSelect(null)}
      >
        {widgets.map(renderWidget)}

        {/* Empty State */}
        {widgets.length === 0 && (
          <div 
            className="col-span-12 row-span-8 flex items-center justify-center"
            style={{ gridColumn: '1 / -1', gridRow: '1 / span 8' }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Canvas Vazio</h2>
              <p className="text-muted-foreground mb-4">
                Comece adicionando gráficos e controles ao seu relatório
              </p>
              <div className="flex gap-2 justify-center">
                <span className="text-xs bg-muted px-2 py-1 rounded">Adicionar Gráfico</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">Adicionar Controle</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}