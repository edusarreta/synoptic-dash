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
  activeFilters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  className?: string;
}

export function DynamicDashboardFilters({
  activeFilters,
  onFiltersChange,
  className
}: DynamicDashboardFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const updateDateRange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    onFiltersChange({
      ...activeFilters,
      dateRange: range
    });
  };

  const clearAllFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({});
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange.from || dateRange.to) count++;
    count += Object.keys(activeFilters).length;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

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
        <div className="space-y-3">
          <Label className="text-sm font-medium">Período</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "d MMM", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "d MMM yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "d MMM yyyy", { locale: ptBR })
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
                  defaultMonth={dateRange.from}
                  selected={dateRange}
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

        {/* Simple Text Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Filtro de Texto</Label>
          <Input
            placeholder="Digite para filtrar..."
            value={activeFilters.textFilter || ''}
            onChange={(e) => onFiltersChange({
              ...activeFilters,
              textFilter: e.target.value
            })}
          />
        </div>

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
                  onClick={clearAllFilters}
                >
                  Atualizar Filtros
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
        {activeFiltersCount === 0 && (
          <div className="text-center py-4">
            <Filter className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Configure filtros acima para refinar a visualização dos gráficos
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}