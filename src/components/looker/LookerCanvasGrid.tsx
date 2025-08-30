import { useRef, useState } from "react";
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
import { BarChart3 } from "lucide-react";
import { DndContext, DragEndEvent, closestCenter, DragOverlay } from '@dnd-kit/core';
import { DraggableWidget } from './DraggableWidget';
import RGL from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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
  const [activeId, setActiveId] = useState<number | null>(null);
  
  // Convert widgets to grid layout format
  const layout = widgets.map(widget => ({
    i: widget.id.toString(),
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: 2,
    minH: 2
  }));

  // Handle grid layout changes (drag and resize)
  const handleLayoutChange = (newLayout: any[]) => {
    console.log('📐 Grid layout changed:', newLayout);
    
    newLayout.forEach(item => {
      const widgetId = parseInt(item.i);
      const widget = widgets.find(w => w.id === widgetId);
      
      if (widget && (
        widget.layout.x !== item.x ||
        widget.layout.y !== item.y ||
        widget.layout.w !== item.w ||
        widget.layout.h !== item.h
      )) {
        onWidgetUpdate(widgetId, {
          layout: {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
          }
        });
      }
    });
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    console.log('🎯 Field drag end:', { active, over });

    // Handle field drop onto widget (for configuration)
    if (active.data.current?.type === 'field' && over.data.current?.type === 'widget') {
      const field = active.data.current.field;
      const widget = over.data.current.widget;
      
      console.log('📝 Configuring widget with field:', { field, widget });
      
      // Update widget configuration based on field type
      const configUpdate: any = {};
      if (field.type === 'dimension') {
        const currentDimensions = Array.isArray(widget.config.dimensions) 
          ? widget.config.dimensions 
          : widget.config.dimension ? [widget.config.dimension] : [];
        configUpdate.dimensions = currentDimensions.includes(field.id) 
          ? currentDimensions 
          : [...currentDimensions, field.id];
      } else if (field.type === 'metric') {
        const currentMetrics = Array.isArray(widget.config.metrics) 
          ? widget.config.metrics 
          : widget.config.metric ? [widget.config.metric] : [];
        configUpdate.metrics = currentMetrics.includes(field.id) 
          ? currentMetrics 
          : [...currentMetrics, field.id];
        configUpdate.aggregation = widget.config.aggregation || 'sum';
      }
      
      onWidgetUpdate(widget.id, {
        config: { ...widget.config, ...configUpdate }
      });
      return;
    }
  };

  // Find active widget for drag overlay
  const dragOverlayWidget = widgets.find(w => w.id === activeId);

  return (
    <DndContext 
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full overflow-auto custom-scrollbar">
        <div
          ref={canvasRef}
          className="mx-auto bg-card shadow-lg"
          style={{ minHeight: '100vh', padding: '16px' }}
          onClick={(e) => {
            e.stopPropagation();
            onWidgetSelect(null);
          }}
        >
          {widgets.length === 0 ? (
            <div className="flex items-center justify-center h-[500px]">
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
          ) : (
            <RGL
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={60}
              width={1200}
              onLayoutChange={handleLayoutChange}
              isResizable={true}
              isDraggable={true}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              useCSSTransforms={true}
            >
              {widgets.map(widget => (
                <div
                  key={widget.id.toString()}
                  data-grid={{
                    i: widget.id.toString(),
                    x: widget.layout.x,
                    y: widget.layout.y,
                    w: widget.layout.w,
                    h: widget.layout.h,
                    minW: 2,
                    minH: 2
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onWidgetSelect(widget.id);
                  }}
                  className={`${selectedWidgetId === widget.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <DraggableWidget
                    widget={widget}
                    isSelected={selectedWidgetId === widget.id}
                    onSelect={onWidgetSelect}
                    onUpdate={onWidgetUpdate}
                    onRemove={onWidgetRemove}
                    processData={processDataForWidget}
                  />
                </div>
              ))}
            </RGL>
          )}
        </div>

        {/* Drag Overlay for field drops */}
        <DragOverlay>
          {dragOverlayWidget ? (
            <div className="bg-card border-2 border-primary rounded-lg shadow-lg opacity-95 transform rotate-3">
              <DraggableWidget
                widget={dragOverlayWidget}
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