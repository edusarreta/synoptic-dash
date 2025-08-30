import { useRef, useEffect, useState } from "react";
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
import { DndContext, DragEndEvent, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { DraggableWidget } from './DraggableWidget';

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
  const [widgetOrder, setWidgetOrder] = useState(widgets.map(w => w.id));
  const [activeId, setActiveId] = useState<number | null>(null);

  // Update widget order when widgets change
  useEffect(() => {
    setWidgetOrder(widgets.map(w => w.id));
  }, [widgets]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    // Handle field drop onto widget (for configuration)
    if (active.data.current?.type === 'field' && over.data.current?.type === 'widget') {
      const field = active.data.current.field;
      const widget = over.data.current.widget;
      
      // Update widget configuration based on field type
      const configUpdate: any = {};
      if (field.type === 'dimension') {
        configUpdate.dimension = field.name;
      } else if (field.type === 'metric') {
        configUpdate.metric = field.name;
      }
      
      onWidgetUpdate(widget.id, {
        config: { ...widget.config, ...configUpdate }
      });
      return;
    }

    // Handle widget reordering/repositioning
    if (active.data.current?.type === 'widget' && over.data.current?.type === 'widget') {
      const activeWidget = widgets.find(w => w.id === active.id);
      const overWidget = widgets.find(w => w.id === over.id);
      
      if (activeWidget && overWidget) {
        // Swap positions
        onWidgetUpdate(activeWidget.id, {
          layout: { ...activeWidget.layout, x: overWidget.layout.x, y: overWidget.layout.y }
        });
        onWidgetUpdate(overWidget.id, {
          layout: { ...overWidget.layout, x: activeWidget.layout.x, y: activeWidget.layout.y }
        });
      }
    }
  };

  const activeWidget = widgets.find(w => w.id === activeId);

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full overflow-auto custom-scrollbar">
        <SortableContext items={widgetOrder}>
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
            onClick={(e) => {
              e.stopPropagation();
              onWidgetSelect(null);
            }}
          >
            {widgets.map(widget => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isSelected={selectedWidgetId === widget.id}
                onSelect={onWidgetSelect}
                onUpdate={onWidgetUpdate}
                onRemove={onWidgetRemove}
                processData={processDataForWidget}
              />
            ))}

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
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? (
            <div className="bg-card border-2 border-primary rounded-lg shadow-lg opacity-95 transform rotate-3">
              <DraggableWidget
                widget={activeWidget}
                isSelected={false}
                onSelect={() => {}}
                onUpdate={() => {}}
                onRemove={() => {}}
                processData={processDataForWidget}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}