import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { ControlConfiguration, FilterCondition } from "./ControlTypes";
import { DropdownControl } from "./types/DropdownControl";
import { AdvancedFilterControl } from "./types/AdvancedFilterControl";
import { DateRangeControl } from "./types/DateRangeControl";
import { SliderControl } from "./types/SliderControl";
import { CheckboxControl } from "./types/CheckboxControl";

interface DraggableControlProps {
  control: ControlConfiguration;
  isSelected: boolean;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onSelect: () => void;
  onUpdate: (control: ControlConfiguration) => void;
  onDelete: () => void;
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

export function DraggableControl({
  control,
  isSelected,
  activeFilter,
  availableDataSources,
  onSelect,
  onUpdate,
  onDelete,
  onFilterChange,
  disabled = false
}: DraggableControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const controlRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    onSelect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - control.position.x,
      y: e.clientY - control.position.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: control.position.width,
      height: control.position.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x);
        const newY = Math.max(0, e.clientY - dragStart.y);
        
        onUpdate({
          ...control,
          position: {
            ...control.position,
            x: newX,
            y: newY
          }
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(100, resizeStart.width + deltaX);
        const newHeight = Math.max(50, resizeStart.height + deltaY);
        
        onUpdate({
          ...control,
          position: {
            ...control.position,
            width: newWidth,
            height: newHeight
          }
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, control, onUpdate]);

  const renderControlContent = () => {
    const commonProps = {
      control,
      activeFilter,
      availableDataSources,
      onFilterChange,
      disabled: disabled || isDragging || isResizing
    };

    switch (control.type) {
      case 'dropdown':
        return <DropdownControl {...commonProps} />;
      case 'advanced-filter':
        return <AdvancedFilterControl {...commonProps} />;
      case 'date-range':
        return <DateRangeControl {...commonProps} />;
      case 'slider':
        return <SliderControl {...commonProps} />;
      case 'checkbox':
        return <CheckboxControl {...commonProps} />;
      default:
        return <div>Tipo de controle não suportado</div>;
    }
  };

  return (
    <div
      ref={controlRef}
      className={`
        absolute group
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${isDragging ? 'z-50' : 'z-10'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}
      `}
      style={{
        left: control.position.x,
        top: control.position.y,
        width: control.position.width,
        height: control.position.height
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onSelect();
      }}
    >
      {/* Control Content */}
      <div 
        className="w-full h-full"
        style={{
          backgroundColor: control.style.container.backgroundColor,
          borderColor: control.style.container.borderColor,
          borderRadius: control.style.container.borderRadius,
          borderWidth: control.style.container.borderWidth,
          boxShadow: control.style.container.shadow
        }}
      >
        {renderControlContent()}
      </div>

      {/* Selection Overlay */}
      {isSelected && !disabled && (
        <>
          {/* Drag Handle */}
          <div 
            className="absolute -top-8 left-0 flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded text-xs cursor-move"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-3 h-3" />
            <span className="font-medium">{control.style.label.text}</span>
          </div>

          {/* Delete Button */}
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-8 -right-8 w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>

          {/* Resize Handle */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize border border-white"
            onMouseDown={handleResizeMouseDown}
          />

          {/* Corner indicators */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
        </>
      )}
    </div>
  );
}