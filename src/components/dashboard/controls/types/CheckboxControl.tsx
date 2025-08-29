import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ControlConfiguration, FilterCondition } from "../ControlTypes";

interface CheckboxControlProps {
  control: ControlConfiguration;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

export function CheckboxControl({
  control,
  activeFilter,
  availableDataSources,
  onFilterChange,
  disabled = false
}: CheckboxControlProps) {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (activeFilter && activeFilter.operator === 'equals') {
      setIsChecked(Boolean(activeFilter.value));
    }
  }, [activeFilter]);

  const handleCheckChange = (checked: boolean) => {
    setIsChecked(checked);
    
    const filter: FilterCondition = {
      field: control.field,
      operator: 'equals',
      value: checked,
      dataSource: control.dataSource
    };
    
    onFilterChange(filter);
  };

  const isConfigured = control.dataSource && control.field;

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Control */}
      {!isConfigured ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded">
          Configure a fonte de dados
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleCheckChange}
              disabled={disabled}
              className="border-2"
            />
            
            <Label 
              className="cursor-pointer"
              style={{
                color: control.style.label.color,
                fontSize: control.style.label.fontSize
              }}
            >
              {control.style.label.text}
            </Label>
          </div>
        </div>
      )}

      {/* Active Filter Indicator */}
      {isChecked && (
        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded mt-2">
          Filtro ativo: {control.style.label.text}
        </div>
      )}
    </div>
  );
}