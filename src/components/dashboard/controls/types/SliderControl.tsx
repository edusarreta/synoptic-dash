import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { ControlConfiguration, FilterCondition } from "../ControlTypes";

interface SliderControlProps {
  control: ControlConfiguration;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

export function SliderControl({
  control,
  activeFilter,
  availableDataSources,
  onFilterChange,
  disabled = false
}: SliderControlProps) {
  const [sliderType, setSliderType] = useState<'single' | 'range'>('range');
  const [values, setValues] = useState<number[]>([0, 100]);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(100);

  // Mock data for demonstration
  useEffect(() => {
    if (control.field) {
      // In real implementation, this would calculate actual min/max from data
      setMinValue(0);
      setMaxValue(10000);
      setValues([0, 10000]);
    }
  }, [control.field]);

  useEffect(() => {
    if (activeFilter) {
      if (activeFilter.operator === 'between' && Array.isArray(activeFilter.value)) {
        setValues(activeFilter.value);
        setSliderType('range');
      } else if (activeFilter.operator === 'equals') {
        setValues([activeFilter.value, activeFilter.value]);
        setSliderType('single');
      }
    }
  }, [activeFilter]);

  const handleSliderChange = (newValues: number[]) => {
    setValues(newValues);
    
    const filter: FilterCondition = {
      field: control.field,
      operator: sliderType === 'range' ? 'between' : 'equals',
      value: sliderType === 'range' ? newValues : newValues[0],
      dataSource: control.dataSource
    };
    
    onFilterChange(filter);
  };

  const handleInputChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const newValues = [...values];
    newValues[index] = Math.max(minValue, Math.min(maxValue, numValue));
    
    if (sliderType === 'single') {
      newValues[1] = newValues[0];
    }
    
    setValues(newValues);
    handleSliderChange(newValues);
  };

  const clearFilter = () => {
    setValues([minValue, maxValue]);
    onFilterChange(null);
  };

  const isConfigured = control.dataSource && control.field;
  const hasActiveFilter = activeFilter && 
    (values[0] !== minValue || values[1] !== maxValue || (sliderType === 'single' && values[0] !== minValue));

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Label */}
      {control.style.label.visible && (
        <Label 
          className="mb-2 block"
          style={{
            color: control.style.label.color,
            fontSize: control.style.label.fontSize,
            textAlign: control.style.label.alignment
          }}
        >
          {control.style.label.text}
        </Label>
      )}

      {/* Control */}
      {!isConfigured ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded">
          Configure a fonte de dados
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-3">
          {/* Type Selector */}
          <Select 
            value={sliderType} 
            onValueChange={(value: 'single' | 'range') => setSliderType(value)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single" className="text-xs">Valor único</SelectItem>
              <SelectItem value="range" className="text-xs">Intervalo</SelectItem>
            </SelectContent>
          </Select>

          {/* Value Inputs */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-gray-500">
                {sliderType === 'range' ? 'Mínimo' : 'Valor'}
              </Label>
              <Input
                type="number"
                value={values[0]}
                onChange={(e) => handleInputChange(0, e.target.value)}
                min={minValue}
                max={maxValue}
                className="h-8 text-xs"
                disabled={disabled}
              />
            </div>
            
            {sliderType === 'range' && (
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Máximo</Label>
                <Input
                  type="number"
                  value={values[1]}
                  onChange={(e) => handleInputChange(1, e.target.value)}
                  min={minValue}
                  max={maxValue}
                  className="h-8 text-xs"
                  disabled={disabled}
                />
              </div>
            )}
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={sliderType === 'range' ? values : [values[0]]}
              onValueChange={handleSliderChange}
              min={minValue}
              max={maxValue}
              step={1}
              disabled={disabled}
              className="w-full"
            />
            
            {/* Range Labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{minValue.toLocaleString()}</span>
              <span>{maxValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Clear Button */}
          {hasActiveFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilter}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}

          {/* Active Filter Indicator */}
          {hasActiveFilter && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              {sliderType === 'range' 
                ? `${values[0].toLocaleString()} - ${values[1].toLocaleString()}`
                : `Valor: ${values[0].toLocaleString()}`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}