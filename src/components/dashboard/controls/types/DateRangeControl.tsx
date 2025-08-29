import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ControlConfiguration, FilterCondition } from "../ControlTypes";
import { cn } from "@/lib/utils";

interface DateRangeControlProps {
  control: ControlConfiguration;
  activeFilter?: FilterCondition;
  availableDataSources: any[];
  onFilterChange: (filter: FilterCondition | null) => void;
  disabled?: boolean;
}

const DATE_PRESETS = [
  { value: 'today', label: 'Hoje', getDates: () => ({ from: new Date(), to: new Date() }) },
  { value: 'yesterday', label: 'Ontem', getDates: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { value: 'last_7_days', label: 'Últimos 7 dias', getDates: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { value: 'last_30_days', label: 'Últimos 30 dias', getDates: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { value: 'this_month', label: 'Este mês', getDates: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { value: 'last_month', label: 'Mês passado', getDates: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { value: 'this_year', label: 'Este ano', getDates: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { value: 'custom', label: 'Personalizado', getDates: () => ({ from: undefined, to: undefined }) }
];

export function DateRangeControl({
  control,
  activeFilter,
  availableDataSources,
  onFilterChange,
  disabled = false
}: DateRangeControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('last_7_days');
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  useEffect(() => {
    if (activeFilter && activeFilter.operator === 'between') {
      const { from, to } = activeFilter.value;
      setCustomRange({ from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined });
      setSelectedPreset('custom');
    }
  }, [activeFilter]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      return;
    }

    const presetData = DATE_PRESETS.find(p => p.value === preset);
    if (presetData) {
      const { from, to } = presetData.getDates();
      applyDateFilter(from, to);
    }
  };

  const handleCustomRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setCustomRange(range);
    setSelectedPreset('custom');
    
    if (range.from && range.to) {
      applyDateFilter(range.from, range.to);
    }
  };

  const applyDateFilter = (from: Date | undefined, to: Date | undefined) => {
    if (from && to) {
      const filter: FilterCondition = {
        field: control.field,
        operator: 'between',
        value: { from: from.toISOString(), to: to.toISOString() },
        dataSource: control.dataSource
      };
      onFilterChange(filter);
    } else {
      onFilterChange(null);
    }
  };

  const clearFilter = () => {
    setSelectedPreset('last_7_days');
    setCustomRange({ from: undefined, to: undefined });
    onFilterChange(null);
  };

  const getDisplayText = () => {
    if (selectedPreset === 'custom' && customRange.from && customRange.to) {
      return `${format(customRange.from, 'dd/MM/yyyy')} - ${format(customRange.to, 'dd/MM/yyyy')}`;
    }
    
    const preset = DATE_PRESETS.find(p => p.value === selectedPreset);
    return preset?.label || 'Selecionar período';
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
          {/* Preset Selector */}
          <Select value={selectedPreset} onValueChange={handlePresetChange} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value} className="text-xs">
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Display/Picker */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between text-left font-normal text-xs",
                  !activeFilter && "text-muted-foreground"
                )}
                disabled={disabled}
                style={{
                  borderColor: control.style.container.borderColor,
                  backgroundColor: control.style.container.backgroundColor
                }}
              >
                <span className="truncate">{getDisplayText()}</span>
                <div className="flex items-center gap-1">
                  {activeFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilter();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                </div>
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customRange.from}
                selected={customRange}
                onSelect={(range) => {
                  if (range) {
                    handleCustomRangeChange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Active Filter Indicator */}
          {activeFilter && (
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Período ativo
            </div>
          )}
        </div>
      )}
    </div>
  );
}