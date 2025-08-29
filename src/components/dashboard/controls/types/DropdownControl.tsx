import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X } from "lucide-react";
import { ControlConfiguration, FilterCondition } from "../ControlTypes";
import { cn } from "@/lib/utils";

interface DropdownControlProps {
  control: ControlConfiguration;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

export function DropdownControl({
  control,
  activeFilter,
  availableDataSources,
  onFilterChange,
  disabled = false
}: DropdownControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [options, setOptions] = useState<Array<{value: string, label: string, count?: number}>>([]);

  // Mock data for demonstration
  useEffect(() => {
    if (control.field) {
      // In real implementation, this would fetch actual data
      const mockOptions = [
        { value: 'brasil', label: 'Brasil', count: 1250 },
        { value: 'usa', label: 'Estados Unidos', count: 2100 },
        { value: 'canada', label: 'Canadá', count: 750 },
        { value: 'mexico', label: 'México', count: 500 },
        { value: 'argentina', label: 'Argentina', count: 300 }
      ];
      setOptions(mockOptions);
    }
  }, [control.field]);

  useEffect(() => {
    if (activeFilter && activeFilter.operator === 'in') {
      setSelectedValues(Array.isArray(activeFilter.value) ? activeFilter.value : [activeFilter.value]);
    }
  }, [activeFilter]);

  const handleValueChange = (value: string, checked: boolean) => {
    let newValues: string[];
    
    if (control.isMultiSelect) {
      if (checked) {
        newValues = [...selectedValues, value];
      } else {
        newValues = selectedValues.filter(v => v !== value);
      }
    } else {
      newValues = checked ? [value] : [];
      setIsOpen(false);
    }
    
    setSelectedValues(newValues);
    
    if (newValues.length > 0) {
      const filter: FilterCondition = {
        field: control.field,
        operator: 'in',
        value: control.isMultiSelect ? newValues : newValues[0],
        dataSource: control.dataSource
      };
      onFilterChange(filter);
    } else {
      onFilterChange(null);
    }
  };

  const clearSelection = () => {
    setSelectedValues([]);
    onFilterChange(null);
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return "Selecionar...";
    }
    
    if (control.isMultiSelect) {
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0]);
        return option?.label || selectedValues[0];
      }
      return `${selectedValues.length} itens selecionados`;
    } else {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
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
        <div className="flex-1 flex flex-col">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between text-left font-normal",
                  selectedValues.length === 0 && "text-muted-foreground"
                )}
                disabled={disabled}
                style={{
                  borderColor: control.style.container.borderColor,
                  backgroundColor: control.style.container.backgroundColor
                }}
              >
                <span className="truncate">{getDisplayText()}</span>
                <div className="flex items-center gap-1">
                  {selectedValues.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelection();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </div>
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder="Buscar..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                </div>
                
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                
                <CommandGroup className="max-h-48 overflow-auto">
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        const isSelected = selectedValues.includes(option.value);
                        handleValueChange(option.value, !isSelected);
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {control.isMultiSelect ? (
                        <Checkbox
                          checked={selectedValues.includes(option.value)}
                          onChange={() => {}}
                        />
                      ) : null}
                      
                      <span className="flex-1">{option.label}</span>
                      
                      {control.metric && option.count && (
                        <Badge variant="secondary" className="text-xs">
                          {option.count.toLocaleString()}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected items for multi-select */}
          {control.isMultiSelect && selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedValues.slice(0, 3).map((value) => {
                const option = options.find(opt => opt.value === value);
                return (
                  <Badge key={value} variant="secondary" className="text-xs">
                    {option?.label || value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-3 w-3 p-0"
                      onClick={() => handleValueChange(value, false)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                );
              })}
              
              {selectedValues.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{selectedValues.length - 3} mais
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}