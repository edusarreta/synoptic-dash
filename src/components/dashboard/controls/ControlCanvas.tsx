import { useState, useRef } from "react";
import { ControlConfiguration, ControlType, FilterCondition } from "./ControlTypes";
import { DraggableControl } from "./DraggableControl";
import { ControlConfigPanel } from "./ControlConfigPanel";
import { createDefaultControl } from "./ControlDefaults";

interface ControlCanvasProps {
  controls: ControlConfiguration[];
  selectedControl: string | null;
  activeFilters: FilterCondition[];
  onControlsChange: (controls: ControlConfiguration[]) => void;
  onFiltersChange: (filters: FilterCondition[]) => void;
  onSelectControl: (controlId: string | null) => void;
  isAddingControl: boolean;
  controlTypeToAdd: ControlType | null;
  onFinishAddingControl: () => void;
  canvasWidth: number;
  canvasHeight: number;
  availableDataSources: any[];
}

export function ControlCanvas({
  controls,
  selectedControl,
  activeFilters,
  onControlsChange,
  onFiltersChange,
  onSelectControl,
  isAddingControl,
  controlTypeToAdd,
  onFinishAddingControl,
  canvasWidth,
  canvasHeight,
  availableDataSources
}: ControlCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!isAddingControl || !controlTypeToAdd) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Create new control at click position
    const newControl = createDefaultControl(controlTypeToAdd, x, y);
    const updatedControls = [...controls, newControl];
    
    onControlsChange(updatedControls);
    onSelectControl(newControl.id);
    onFinishAddingControl();
  };

  const handleControlUpdate = (updatedControl: ControlConfiguration) => {
    const updatedControls = controls.map(control => 
      control.id === updatedControl.id ? updatedControl : control
    );
    onControlsChange(updatedControls);
  };

  const handleControlDelete = (controlId: string) => {
    const updatedControls = controls.filter(control => control.id !== controlId);
    onControlsChange(updatedControls);
    
    // Remove related filters
    const updatedFilters = activeFilters.filter(filter => {
      const control = controls.find(c => c.id === controlId);
      return !(control && filter.field === control.field && filter.dataSource === control.dataSource);
    });
    onFiltersChange(updatedFilters);
    
    if (selectedControl === controlId) {
      onSelectControl(null);
    }
  };

  const handleFilterChange = (controlId: string, newFilter: FilterCondition | null) => {
    const control = controls.find(c => c.id === controlId);
    if (!control) return;

    // Remove existing filters for this control
    let updatedFilters = activeFilters.filter(filter => 
      !(filter.field === control.field && filter.dataSource === control.dataSource)
    );

    // Add new filter if provided
    if (newFilter) {
      updatedFilters.push(newFilter);
    }

    onFiltersChange(updatedFilters);
  };

  const getActiveFilterForControl = (control: ControlConfiguration): FilterCondition | undefined => {
    return activeFilters.find(filter => 
      filter.field === control.field && filter.dataSource === control.dataSource
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        <div
          ref={canvasRef}
          className={`
            w-full h-full relative overflow-hidden bg-gray-50 
            ${isAddingControl ? 'cursor-crosshair' : 'cursor-default'}
          `}
          onClick={handleCanvasClick}
          style={{ minHeight: canvasHeight, width: canvasWidth }}
        >
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Adding Control Overlay */}
          {isAddingControl && (
            <div className="absolute inset-0 bg-blue-50/30 border-2 border-dashed border-blue-300 flex items-center justify-center z-10">
              <div className="bg-white rounded-lg p-4 shadow-lg border">
                <p className="text-sm text-gray-600 font-medium">
                  Clique em qualquer lugar para posicionar o controle
                </p>
              </div>
            </div>
          )}

          {/* Render Controls */}
          {controls.map((control) => (
            <DraggableControl
              key={control.id}
              control={control}
              isSelected={selectedControl === control.id}
              activeFilter={getActiveFilterForControl(control)}
              availableDataSources={availableDataSources}
              onSelect={() => onSelectControl(control.id)}
              onUpdate={handleControlUpdate}
              onDelete={() => handleControlDelete(control.id)}
              onFilterChange={(filter) => handleFilterChange(control.id, filter)}
              disabled={isAddingControl}
            />
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      {selectedControl && (
        <div className="w-80 border-l border-gray-200 bg-white">
          <ControlConfigPanel
            control={controls.find(c => c.id === selectedControl)!}
            availableDataSources={availableDataSources}
            onUpdate={handleControlUpdate}
            onClose={() => onSelectControl(null)}
          />
        </div>
      )}
    </div>
  );
}