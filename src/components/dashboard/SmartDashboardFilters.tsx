import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, CheckCheck, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SmartFilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
    field: string;
  };
  fieldFilters: Record<string, {
    values: string[];
    field: string;
  }>;
  textFilters: Record<string, {
    value: string;
    field: string;
  }>;
}

interface SmartDashboardFiltersProps {
  charts: Array<{
    id: string;
    name: string;
    data: any[];
    chart_config?: {
      filterableColumns?: string[];
    };
  }>;
  activeFilters: SmartFilterState;
  onFiltersChange: (filters: SmartFilterState) => void;
  className?: string;
}

export function SmartDashboardFilters({
  charts,
  activeFilters,
  onFiltersChange,
  className
}: SmartDashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableFields, setAvailableFields] = useState<Record<string, any>>({});

  useEffect(() => {
    if (charts.length > 0) {
      extractAvailableFields();
    }
  }, [charts]);

  const extractAvailableFields = () => {
    const fieldsData: Record<string, any> = {};
    
    charts.forEach(chart => {
      if (chart.data && chart.data.length > 0) {
        const sampleRow = chart.data[0];
        
        // Get filterable columns from chart config
        const filterableColumns = chart.chart_config?.filterableColumns || [];
        
        // Only process columns that are marked as filterable
        filterableColumns.forEach(fieldName => {
          if (fieldName in sampleRow && !fieldsData[fieldName]) {
            fieldsData[fieldName] = {
              type: detectFieldType(sampleRow[fieldName], fieldName),
              values: new Set(),
              chartSources: new Set()
            };
          }
          
          if (fieldName in sampleRow) {
            fieldsData[fieldName].chartSources.add(chart.name);
            
            // Collect unique values for categorical fields
            if (fieldsData[fieldName].type === 'text') {
              chart.data.forEach(row => {
                const value = row[fieldName];
                if (value != null && String(value).length < 50) { // Avoid very long strings
                  fieldsData[fieldName].values.add(String(value));
                }
              });
            }
          }
        });
      }
    });

    // Convert Sets to Arrays for easier handling
    Object.keys(fieldsData).forEach(field => {
      fieldsData[field].values = Array.from(fieldsData[field].values).slice(0, 20); // Limit options
      fieldsData[field].chartSources = Array.from(fieldsData[field].chartSources);
    });

    setAvailableFields(fieldsData);
  };

  const detectFieldType = (value: any, fieldName: string): string => {
    if (value === null || value === undefined) return 'text';
    
    const fieldLower = fieldName.toLowerCase();
    
    // Date detection
    if (fieldLower.includes('date') || fieldLower.includes('time') || 
        fieldLower.includes('created') || fieldLower.includes('updated')) {
      return 'date';
    }
    
    // Type-based detection
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Try to parse as date
      if (!isNaN(Date.parse(value)) && value.includes('-')) return 'date';
      return 'text';
    }
    
    return 'text';
  };

  const updateFilters = (updates: Partial<SmartFilterState>) => {
    onFiltersChange({
      ...activeFilters,
      ...updates
    });
  };

  const updateDateRange = (range: { from: Date | undefined; to: Date | undefined }, field: string) => {
    updateFilters({
      dateRange: { ...range, field }
    });
  };

  const toggleFieldFilter = (fieldName: string, value: string) => {
    const currentFilter = activeFilters.fieldFilters[fieldName] || { values: [], field: fieldName };
    const currentValues = currentFilter.values;
    
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    updateFilters({
      fieldFilters: {
        ...activeFilters.fieldFilters,
        [fieldName]: {
          values: newValues,
          field: fieldName
        }
      }
    });
  };

  const updateTextFilter = (fieldName: string, value: string) => {
    const newTextFilters = { ...activeFilters.textFilters };
    
    if (value.trim()) {
      newTextFilters[fieldName] = { value: value.trim(), field: fieldName };
    } else {
      delete newTextFilters[fieldName];
    }
    
    updateFilters({
      textFilters: newTextFilters
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined, field: '' },
      fieldFilters: {},
      textFilters: {}
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.dateRange.from || activeFilters.dateRange.to) count++;
    count += Object.values(activeFilters.fieldFilters).reduce((sum, filter) => sum + filter.values.length, 0);
    count += Object.keys(activeFilters.textFilters).length;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const dateFields = Object.keys(availableFields).filter(field => availableFields[field].type === 'date');
  const textFields = Object.keys(availableFields).filter(field => 
    availableFields[field].type === 'text' && availableFields[field].values.length > 0
  );

  return (
    <Card className={cn("glass-card border-0 shadow-card", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Filtros Dinâmicos</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar Todos
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Menos filtros' : 'Mais filtros'}
            </Button>
          </div>
        </div>
        <CardDescription>
          Filtros configurados no Chart Builder - estilo Looker Studio • {Object.keys(availableFields).length} campos disponíveis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Range Filter */}
        {dateFields.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Filtro de Data</Label>
            <div className="space-y-2">
              <Select
                value={activeFilters.dateRange.field || ''}
                onValueChange={(field) => updateDateRange(activeFilters.dateRange, field)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecione um campo de data" />
                </SelectTrigger>
                <SelectContent>
                  {dateFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field} ({availableFields[field].chartSources.join(', ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {activeFilters.dateRange.field && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !activeFilters.dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {activeFilters.dateRange.from ? (
                        activeFilters.dateRange.to ? (
                          <>
                            {format(activeFilters.dateRange.from, "d MMM", { locale: ptBR })} -{" "}
                            {format(activeFilters.dateRange.to, "d MMM yyyy", { locale: ptBR })}
                          </>
                        ) : (
                          format(activeFilters.dateRange.from, "d MMM yyyy", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={activeFilters.dateRange.from}
                      selected={activeFilters.dateRange}
                      onSelect={(range) => {
                        if (range) {
                          updateDateRange({ from: range.from, to: range.to }, activeFilters.dateRange.field);
                        } else {
                          updateDateRange({ from: undefined, to: undefined }, activeFilters.dateRange.field);
                        }
                      }}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}

        {/* Text Search Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Busca por Texto</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(availableFields)
              .filter(field => availableFields[field].type === 'text')
              .slice(0, 4)
              .map((fieldName) => (
                <div key={fieldName} className="space-y-1">
                  <Label className="text-xs text-gray-500">{fieldName}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <Input
                      placeholder={`Buscar em ${fieldName}...`}
                      value={activeFilters.textFilters[fieldName]?.value || ''}
                      onChange={(e) => updateTextFilter(fieldName, e.target.value)}
                      className="pl-7 h-8 text-xs"
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Field Value Filters */}
        {textFields.slice(0, 3).map((fieldName) => (
          <div key={fieldName} className="space-y-3">
            <Label className="text-sm font-medium">
              {fieldName} 
              <span className="text-xs text-gray-500 ml-1">
                ({availableFields[fieldName].chartSources.length} gráfico{availableFields[fieldName].chartSources.length > 1 ? 's' : ''})
              </span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {availableFields[fieldName].values.slice(0, 12).map((value: any) => (
                <div key={`${fieldName}-${value}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldName}-${value}`}
                    checked={(activeFilters.fieldFilters[fieldName]?.values || []).includes(String(value))}
                    onCheckedChange={() => toggleFieldFilter(fieldName, String(value))}
                  />
                  <Label
                    htmlFor={`${fieldName}-${value}`}
                    className="text-sm font-normal cursor-pointer truncate max-w-24"
                    title={String(value)}
                  >
                    {String(value)}
                  </Label>
                </div>
              ))}
            </div>
            {activeFilters.fieldFilters[fieldName]?.values?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeFilters.fieldFilters[fieldName].values.map((value) => (
                  <Badge key={value} variant="secondary" className="text-xs">
                    {value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleFieldFilter(fieldName, value)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Expanded Filters */}
        {isExpanded && textFields.length > 3 && (
          <div className="space-y-6 pt-4 border-t">
            {textFields.slice(3).map((fieldName) => (
              <div key={fieldName} className="space-y-3">
                <Label className="text-sm font-medium">
                  {fieldName}
                  <span className="text-xs text-gray-500 ml-1">
                    ({availableFields[fieldName].chartSources.join(', ')})
                  </span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto">
                  {availableFields[fieldName].values.slice(0, 9).map((value: any) => (
                    <div key={`${fieldName}-${value}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${fieldName}-${value}`}
                        checked={(activeFilters.fieldFilters[fieldName]?.values || []).includes(String(value))}
                        onCheckedChange={() => toggleFieldFilter(fieldName, String(value))}
                      />
                      <Label
                        htmlFor={`${fieldName}-${value}`}
                        className="text-sm font-normal cursor-pointer truncate"
                        title={String(value)}
                      >
                        {String(value)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No data message */}
        {Object.keys(availableFields).length === 0 && (
          <div className="text-center py-8">
            <Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma coluna configurada para filtros.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure colunas filtráveis no Chart Builder para ativar filtros dinâmicos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}