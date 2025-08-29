import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { ControlConfiguration, FilterCondition } from "../ControlTypes";

interface AdvancedFilterControlProps {
  control: ControlConfiguration;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

const CONDITION_OPTIONS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'starts_with', label: 'Começa com' },
  { value: 'ends_with', label: 'Termina com' },
  { value: 'regex', label: 'Expressão Regular' }
];

export function AdvancedFilterControl({
  control,
  activeFilter,
  availableDataSources,
  onFilterChange,
  disabled = false
}: AdvancedFilterControlProps) {
  const [searchValue, setSearchValue] = useState("");
  const [condition, setCondition] = useState(control.condition || 'contains');

  useEffect(() => {
    if (activeFilter) {
      setSearchValue(activeFilter.value || "");
      setCondition(activeFilter.operator as any);
    }
  }, [activeFilter]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    
    if (value.trim()) {
      const filter: FilterCondition = {
        field: control.field,
        operator: condition as any,
        value: value.trim(),
        dataSource: control.dataSource
      };
      onFilterChange(filter);
    } else {
      onFilterChange(null);
    }
  };

  const handleConditionChange = (newCondition: string) => {
    setCondition(newCondition as any);
    
    if (searchValue.trim()) {
      const filter: FilterCondition = {
        field: control.field,
        operator: newCondition as any,
        value: searchValue.trim(),
        dataSource: control.dataSource
      };
      onFilterChange(filter);
    }
  };

  const clearFilter = () => {
    setSearchValue("");
    onFilterChange(null);
  };

  const isConfigured = control.dataSource && control.field;

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
        <div className="flex-1 flex flex-col space-y-2">
          {/* Condition Selector */}
          <Select value={condition} onValueChange={handleConditionChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            
            <Input
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Digite para filtrar..."
              className="pl-8 pr-8"
              disabled={disabled}
              style={{
                borderColor: control.style.container.borderColor,
                backgroundColor: control.style.container.backgroundColor,
                color: control.style.options.textColor
              }}
            />
            
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearFilter}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Active Filter Indicator */}
          {searchValue && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Filtrando: <span className="font-medium">{searchValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}