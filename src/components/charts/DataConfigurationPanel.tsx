import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings, Calendar, Hash, Type, BarChart3, Filter } from "lucide-react";
import { DatabaseTable } from "@/hooks/useDatabase";

export interface FieldConfiguration {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  format?: string;
  useInFilters: boolean;
  useAsDateFilter: boolean;
  filterOptions?: string[];
}

export interface DataConfiguration {
  fields: FieldConfiguration[];
  primaryDateField?: string;
  secondaryDateField?: string;
  categoryFields: string[];
  statusFields: string[];
}

interface DataConfigurationPanelProps {
  tables: DatabaseTable[];
  selectedTables: string[];
  data: any[];
  configuration: DataConfiguration;
  onConfigurationChange: (config: DataConfiguration) => void;
  className?: string;
}

export function DataConfigurationPanel({
  tables,
  selectedTables,
  data,
  configuration,
  onConfigurationChange,
  className
}: DataConfigurationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get available columns from data and tables
  const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];
  
  useEffect(() => {
    // Auto-detect field types when data changes
    if (data.length > 0 && configuration.fields.length === 0) {
      const detectedFields = availableColumns.map(column => {
        const sampleValue = data[0][column];
        const type = detectFieldType(sampleValue, column);
        
        return {
          name: column,
          type,
          format: getDefaultFormat(type),
          useInFilters: ['string', 'boolean'].includes(typeof sampleValue),
          useAsDateFilter: type === 'date',
          filterOptions: type === 'text' ? getUniqueValues(data, column) : undefined
        };
      });

      onConfigurationChange({
        ...configuration,
        fields: detectedFields,
        primaryDateField: detectedFields.find(f => f.type === 'date')?.name,
        categoryFields: detectedFields.filter(f => f.type === 'text' && f.useInFilters).map(f => f.name),
        statusFields: detectedFields.filter(f => f.type === 'boolean').map(f => f.name)
      });
    }
  }, [data, availableColumns.join(',')]);

  const detectFieldType = (value: any, fieldName: string): FieldConfiguration['type'] => {
    if (value === null || value === undefined) return 'text';
    
    const fieldLower = fieldName.toLowerCase();
    
    // Date detection
    if (fieldLower.includes('date') || fieldLower.includes('time') || fieldLower.includes('created') || fieldLower.includes('updated')) {
      return 'date';
    }
    
    // Currency detection
    if (fieldLower.includes('price') || fieldLower.includes('cost') || fieldLower.includes('amount') || fieldLower.includes('value')) {
      return 'currency';
    }
    
    // Percentage detection
    if (fieldLower.includes('percent') || fieldLower.includes('rate') || fieldLower.includes('ratio')) {
      return 'percentage';
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

  const getDefaultFormat = (type: FieldConfiguration['type']): string => {
    switch (type) {
      case 'date': return 'dd/MM/yyyy';
      case 'currency': return 'R$ #,##0.00';
      case 'percentage': return '#,##0.00%';
      case 'number': return '#,##0.##';
      default: return '';
    }
  };

  const getUniqueValues = (data: any[], column: string): string[] => {
    const values = data.map(row => row[column]).filter(v => v != null);
    return [...new Set(values)].slice(0, 20); // Limit to 20 unique values
  };

  const updateFieldConfiguration = (fieldName: string, updates: Partial<FieldConfiguration>) => {
    const updatedFields = configuration.fields.map(field =>
      field.name === fieldName ? { ...field, ...updates } : field
    );
    
    onConfigurationChange({
      ...configuration,
      fields: updatedFields
    });
  };

  const updateCategoryFields = () => {
    const categoryFields = configuration.fields
      .filter(f => f.useInFilters && f.type === 'text')
      .map(f => f.name);
    
    onConfigurationChange({
      ...configuration,
      categoryFields
    });
  };

  const updateStatusFields = () => {
    const statusFields = configuration.fields
      .filter(f => f.useInFilters && f.type === 'boolean')
      .map(f => f.name);
    
    onConfigurationChange({
      ...configuration,
      statusFields
    });
  };

  if (availableColumns.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Configuração dos Dados</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar' : 'Configurar Campos'}
          </Button>
        </div>
        <CardDescription>
          Configure os tipos de dados e campos para filtros
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Field Type Configuration */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Tipos de Campo</Label>
            <div className="grid gap-4">
              {configuration.fields.map((field) => (
                <div key={field.name} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Campo</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {field.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: FieldConfiguration['type']) =>
                        updateFieldConfiguration(field.name, { type: value })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <Type className="w-3 h-3" />
                            Texto
                          </div>
                        </SelectItem>
                        <SelectItem value="number">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3" />
                            Número
                          </div>
                        </SelectItem>
                        <SelectItem value="date">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Data
                          </div>
                        </SelectItem>
                        <SelectItem value="currency">💰 Moeda</SelectItem>
                        <SelectItem value="percentage">📊 Porcentagem</SelectItem>
                        <SelectItem value="boolean">✓ Verdadeiro/Falso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Usar em Filtros</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${field.name}`}
                        checked={field.useInFilters}
                        onCheckedChange={(checked) =>
                          updateFieldConfiguration(field.name, { useInFilters: !!checked })
                        }
                      />
                      <Label htmlFor={`filter-${field.name}`} className="text-sm">
                        <Filter className="w-3 h-3 inline mr-1" />
                        Filtrar
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Filtro de Data</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`date-filter-${field.name}`}
                        checked={field.useAsDateFilter}
                        onCheckedChange={(checked) =>
                          updateFieldConfiguration(field.name, { useAsDateFilter: !!checked })
                        }
                        disabled={field.type !== 'date'}
                      />
                      <Label htmlFor={`date-filter-${field.name}`} className="text-sm">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Data Principal
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Field Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Campos de Data para Filtros</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Data Principal</Label>
                <Select
                  value={configuration.primaryDateField || ""}
                  onValueChange={(value) =>
                    onConfigurationChange({
                      ...configuration,
                      primaryDateField: value
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar campo de data" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuration.fields
                      .filter(f => f.type === 'date')
                      .map(field => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Data Secundária (Opcional)</Label>
                <Select
                  value={configuration.secondaryDateField || ""}
                  onValueChange={(value) =>
                    onConfigurationChange({
                      ...configuration,
                      secondaryDateField: value
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar campo de data" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuration.fields
                      .filter(f => f.type === 'date' && f.name !== configuration.primaryDateField)
                      .map(field => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {configuration.fields.filter(f => f.useInFilters).length}
                </div>
                <div className="text-xs text-muted-foreground">Campos para Filtro</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {configuration.fields.filter(f => f.type === 'date').length}
                </div>
                <div className="text-xs text-muted-foreground">Campos de Data</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {configuration.fields.filter(f => f.type === 'number' || f.type === 'currency').length}
                </div>
                <div className="text-xs text-muted-foreground">Campos Numéricos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {configuration.fields.length}
                </div>
                <div className="text-xs text-muted-foreground">Total de Campos</div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}