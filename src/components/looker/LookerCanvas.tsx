import { useState, useRef } from "react";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import { Trash2, Edit3, GripHorizontal } from "lucide-react";

interface ChartElement {
  id: string;
  type: 'chart' | 'control' | 'text' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  style: any;
}

interface LookerCanvasProps {
  elements: ChartElement[];
  selectedElement: string | null;
  isAddingElement: boolean;
  onElementSelect: (elementId: string) => void;
  onCanvasClick: (x: number, y: number) => void;
  onElementUpdate: (elementId: string, updates: Partial<ChartElement>) => void;
  onElementDelete: (elementId: string) => void;
}

export function LookerCanvas({
  elements,
  selectedElement,
  isAddingElement,
  onElementSelect,
  onCanvasClick,
  onElementUpdate,
  onElementDelete
}: LookerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!isAddingElement) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    onCanvasClick(x, y);
  };

  const handleElementDrag = (elementId: string, d: { x: number; y: number }) => {
    onElementUpdate(elementId, {
      position: { x: d.x, y: d.y }
    });
  };

  const handleElementResize = (elementId: string, size: { width: number; height: number }) => {
    onElementUpdate(elementId, {
      size: { width: size.width, height: size.height }
    });
  };

  const renderElement = (element: ChartElement) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <Rnd
        key={element.id}
        size={element.size}
        position={element.position}
        onDragStart={() => setDraggedElement(element.id)}
        onDragStop={(e, d) => {
          setDraggedElement(null);
          handleElementDrag(element.id, d);
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          handleElementResize(element.id, {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height)
          });
          handleElementDrag(element.id, position);
        }}
        bounds="parent"
        minWidth={200}
        minHeight={150}
        className={`
          ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
          ${draggedElement === element.id ? 'shadow-lg' : ''}
        `}
      >
        <div
          className={`
            w-full h-full bg-card border border-border rounded-lg shadow-sm
            ${isSelected ? 'shadow-md' : ''}
            transition-all duration-200
          `}
          onClick={(e) => {
            e.stopPropagation();
            onElementSelect(element.id);
          }}
        >
          {/* Element Header */}
          {isSelected && (
            <div className="absolute -top-8 left-0 flex items-center gap-1 bg-card border border-border rounded px-2 py-1 shadow-sm">
              <GripHorizontal className="w-3 h-3 text-muted-foreground cursor-move" />
              <span className="text-xs font-medium capitalize">{element.type}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onElementDelete(element.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Element Content */}
          <div className="w-full h-full p-4 flex items-center justify-center">
            {element.type === 'chart' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Edit3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm mb-1">Novo Gráfico</h3>
                <p className="text-xs text-muted-foreground">
                  Configure a fonte de dados
                </p>
              </div>
            )}
            
            {element.type === 'control' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <span className="text-lg">⚙️</span>
                </div>
                <h3 className="font-medium text-sm mb-1">Novo Controle</h3>
                <p className="text-xs text-muted-foreground">
                  Selecione o tipo de filtro
                </p>
              </div>
            )}
            
            {element.type === 'text' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <span className="text-lg">📝</span>
                </div>
                <h3 className="font-medium text-sm mb-1">Texto</h3>
                <p className="text-xs text-muted-foreground">
                  Clique para editar
                </p>
              </div>
            )}
            
            {element.type === 'image' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <span className="text-lg">🖼️</span>
                </div>
                <h3 className="font-medium text-sm mb-1">Imagem</h3>
                <p className="text-xs text-muted-foreground">
                  Adicione uma imagem
                </p>
              </div>
            )}
          </div>
        </div>
      </Rnd>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div
        ref={canvasRef}
        className={`
          w-full h-full relative
          ${isAddingElement ? 'cursor-crosshair' : 'cursor-default'}
        `}
        onClick={handleCanvasClick}
        style={{ minHeight: '100%', minWidth: '100%' }}
      >
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Adding Element Overlay */}
        {isAddingElement && (
          <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center z-10">
            <div className="bg-card rounded-lg p-6 shadow-lg border max-w-sm text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-xl">📍</span>
              </div>
              <h3 className="font-medium mb-2">Posicionar Elemento</h3>
              <p className="text-sm text-muted-foreground">
                Clique em qualquer lugar do canvas para posicionar o novo elemento
              </p>
            </div>
          </div>
        )}

        {/* Render Elements */}
        {elements.map(renderElement)}

        {/* Empty State */}
        {elements.length === 0 && !isAddingElement && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-6 mx-auto">
                <span className="text-2xl">📊</span>
              </div>
              <h2 className="text-xl font-semibold mb-3">Canvas Vazio</h2>
              <p className="text-muted-foreground mb-6">
                Comece adicionando gráficos, controles ou outros elementos visuais ao seu dashboard.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="text-xs bg-muted px-2 py-1 rounded">Adicionar gráfico</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">Adicionar controle</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">Adicionar texto</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}