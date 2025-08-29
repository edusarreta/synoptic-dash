import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, CheckCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FilterState {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  categories: string[];
  status: string[];
  customFilters: Record<string, any>;
}

interface DashboardFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCategories?: string[];
  availableStatus?: string[];
  className?: string;
}

export function DashboardFilters({
  filters,
  onFiltersChange,
  availableCategories = ["Vendas", "Marketing", "Financeiro", "Operações", "RH"],
  availableStatus = ["Ativo", "Inativo", "Pendente", "Concluído"],
  className
}: DashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<FilterState>) => {
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

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    updateFilters({ categories: newCategories });
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    updateFilters({ status: newStatus });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      categories: [],
      status: [],
      customFilters: {}
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    count += filters.categories.length;
    count += filters.status.length;
    count += Object.keys(filters.customFilters).length;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={cn("glass-card border-0 shadow-card", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Filtros</CardTitle>
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
          Filtre os dados dos gráficos por período, categoria e status
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date Range Filter */}
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

        {/* Categories Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Categorias</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableCategories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <Label
                  htmlFor={`category-${category}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {category}
                </Label>
              </div>
            ))}
          </div>
          {filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.categories.map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleCategory(category)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableStatus.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                />
                <Label
                  htmlFor={`status-${status}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {status}
                </Label>
              </div>
            ))}
          </div>
          {filters.status.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.status.map((status) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleStatus(status)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Additional Custom Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filtros Adicionais</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={filters.customFilters.region || ""}
                  onValueChange={(value) => updateFilters({
                    customFilters: { ...filters.customFilters, region: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="norte">Norte</SelectItem>
                    <SelectItem value="nordeste">Nordeste</SelectItem>
                    <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
                    <SelectItem value="sudeste">Sudeste</SelectItem>
                    <SelectItem value="sul">Sul</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.customFilters.department || ""}
                  onValueChange={(value) => updateFilters({
                    customFilters: { ...filters.customFilters, department: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="ti">Tecnologia</SelectItem>
                    <SelectItem value="rh">Recursos Humanos</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
      </CardContent>
    </Card>
  );
}