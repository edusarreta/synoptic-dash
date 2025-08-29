import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, CheckCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDatabase } from "@/hooks/useDatabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DynamicFilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  fieldFilters: Record<string, string[]>;
  customFilters: Record<string, any>;
}

interface DynamicDashboardFiltersProps {
  filters: DynamicFilterState;
  onFiltersChange: (filters: DynamicFilterState) => void;
  savedCharts: any[];
  className?: string;
}

export function DynamicDashboardFilters({
  filters,
  onFiltersChange,
  savedCharts,
  className
}: DynamicDashboardFiltersProps) {
  const { user } = useAuth();
  const { connections, executeQuery } = useDatabase();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableFields, setAvailableFields] = useState<Record<string, any[]>>({});
  const [fieldTypes, setFieldTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (savedCharts.length > 0) {
      loadAvailableFields();
    }
  }, [savedCharts]);

  const loadAvailableFields = async () => {
    setLoading(true);
    try {
      const fieldsMap: Record<string, any[]> = {};
      const typesMap: Record<string, string> = {};

      // Process each saved chart to extract available fields
      for (const chart of savedCharts.slice(0, 5)) { // Limit to avoid too many requests
        try {
          if (chart.sql_query && chart.data_connection_id) {
            // Execute a modified query to get sample data and field types
            const sampleQuery = `${chart.sql_query.replace(/LIMIT\s+\d+/i, '')} LIMIT 10`;
            
            const result = await executeQuery(chart.data_connection_id, sampleQuery);
            
            if (result.data && result.data.length > 0) {
              const sampleRow = result.data[0];
              
              Object.keys(sampleRow).forEach(fieldName => {
                const value = sampleRow[fieldName];
                const fieldType = detectFieldType(value, fieldName);
                
                typesMap[fieldName] = fieldType;
                
                // Collect unique values for text fields
                if (fieldType === 'text' || fieldType === 'boolean') {
                  const uniqueValues = [...new Set(result.data.map(row => row[fieldName]))];
                  
                  if (!fieldsMap[fieldName]) {
                    fieldsMap[fieldName] = [];
                  }
                  
                  uniqueValues.forEach(value => {
                    if (value != null && !fieldsMap[fieldName].includes(value)) {
                      fieldsMap[fieldName].push(value);
                    }
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error loading fields for chart ${chart.name}:`, error);
        }
      }

      setAvailableFields(fieldsMap);
      setFieldTypes(typesMap);
    } catch (error) {
      console.error('Error loading available fields:', error);
      toast.error('Erro ao carregar campos disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const detectFieldType = (value: any, fieldName: string): string => {
    if (value === null || value === undefined) return 'text';
    
    const fieldLower = fieldName.toLowerCase();
    
    // Date detection
    if (fieldLower.includes('date') || fieldLower.includes('time') || fieldLower.includes('created') || fieldLower.includes('updated')) {
      return 'date';
    }
    
    // Type-based detection
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Try to parse as date
      if (!isNaN(Date.parse(value))) return 'date';
      return 'text';
    }
    
    return 'text';
  };

  const updateFilters = (updates: Partial<DynamicFilterState>) => {
    onFiltersChange({
      ...filters,
      ...updates
    });
  };

  const updateDateRange = (range: { from: Date | undefined; to: Date | undefined }) => {
    updateFilters({
      dateRange: range
    });
  };

  const toggleFieldFilter = (fieldName: string, value: string) => {
    const currentValues = filters.fieldFilters[fieldName] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    updateFilters({
      fieldFilters: {
        ...filters.fieldFilters,
        [fieldName]: newValues
      }
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      fieldFilters: {},
      customFilters: {}
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    count += Object.values(filters.fieldFilters).reduce((sum, values) => sum + values.length, 0);
    count += Object.keys(filters.customFilters).length;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const dateFields = Object.keys(fieldTypes).filter(field => fieldTypes[field] === 'date');
  const textFields = Object.keys(availableFields).filter(field => fieldTypes[field] === 'text');

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
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
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
          Filtros baseados nos dados reais dos seus gráficos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Range Filter */}
        {dateFields.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "d MMM", { locale: ptBR })} -{" "}
                          {format(filters.dateRange.to, "d MMM yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(filters.dateRange.from, "d MMM yyyy", { locale: ptBR })
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
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      if (range) {
                        updateDateRange({ from: range.from, to: range.to });
                      } else {
                        updateDateRange({ from: undefined, to: undefined });
                      }
                    }}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Dynamic Field Filters */}
        {textFields.map((fieldName) => (
          <div key={fieldName} className="space-y-3">
            <Label className="text-sm font-medium">{fieldName}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableFields[fieldName]?.slice(0, 6).map((value: any) => (
                <div key={`${fieldName}-${value}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldName}-${value}`}
                    checked={(filters.fieldFilters[fieldName] || []).includes(String(value))}
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
            {filters.fieldFilters[fieldName]?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.fieldFilters[fieldName].map((value) => (
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
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Quick Filter Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filtros Rápidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    updateDateRange({ from: lastMonth, to: today });
                  }}
                >
                  Último mês
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const lastQuarter = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
                    updateDateRange({ from: lastQuarter, to: today });
                  }}
                >
                  Último trimestre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const thisYear = new Date(today.getFullYear(), 0, 1);
                    updateDateRange({ from: thisYear, to: today });
                  }}
                >
                  Este ano
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableFields}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    "Atualizar Filtros"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Apply Filters Button */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <Button className="w-full gradient-primary">
              <CheckCheck className="w-4 h-4 mr-2" />
              Aplicar Filtros ({activeFiltersCount})
            </Button>
          </div>
        )}

        {/* No filters message */}
        {Object.keys(availableFields).length === 0 && !loading && (
          <div className="text-center py-8">
            <Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Execute algumas consultas nos gráficos para gerar filtros dinâmicos
            </p>
            <Button variant="outline" size="sm" onClick={loadAvailableFields} className="mt-2">
              Carregar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}