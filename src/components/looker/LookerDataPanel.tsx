import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Search, 
  Plus, 
  Hash, 
  Calendar, 
  Type, 
  BarChart3,
  ArrowLeft,
  Loader2
} from "lucide-react";

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
}

interface Table {
  name: string;
  columns?: any[];
}

interface DataFieldsPanelProps {
  dataSources: DataSource[];
  selectedDataSource: string;
  selectedTable: string;
  tables: Table[];
  dataFields: DataField[];
  isLoadingFields: boolean;
  selectedWidget: any;
  onDataSourceChange: (dataSourceId: string) => void;
  onTableChange: (tableName: string) => void;
  onFieldClick?: (field: DataField) => void;
}

export function LookerDataPanel({
  dataSources,
  selectedDataSource,
  selectedTable,
  tables,
  dataFields,
  isLoadingFields,
  selectedWidget,
  onDataSourceChange,
  onTableChange,
  onFieldClick
}: DataFieldsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCalculatedFieldDialog, setShowCalculatedFieldDialog] = useState(false);

  console.log('🔍 LookerDataPanel render:', {
    connectionsCount: dataSources.length,
    selectedDataSource,
    selectedTable,
    tablesCount: tables.length,
    dataFieldsCount: dataFields.length,
    isLoadingFields
  });

  // Filter fields based on search term
  const filteredFields = dataFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.dataType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate dimensions and metrics
  const dimensionFields = filteredFields.filter(field => field.type === 'dimension');
  const metricFields = filteredFields.filter(field => field.type === 'metric');

  const getFieldIcon = (dataType: string) => {
    const type = dataType.toLowerCase();
    if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('numeric')) {
      return <Hash className="w-3 h-3 text-muted-foreground mr-2" />;
    } else if (type.includes('date') || type.includes('time')) {
      return <Calendar className="w-3 h-3 text-muted-foreground mr-2" />;
    } else {
      return <Type className="w-3 h-3 text-muted-foreground mr-2" />;
    }
  };

  const handleBackToTables = () => {
    onTableChange('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Data Source Selector */}
      <div className="p-4 border-b border-border">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Fonte de Dados
        </label>
        <Select value={selectedDataSource} onValueChange={onDataSourceChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma fonte de dados" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border shadow-lg z-50">
            {dataSources.map((source) => (
              <SelectItem 
                key={source.id} 
                value={source.id}
                className="hover:bg-accent cursor-pointer"
              >
                <div className="flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  {source.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedDataSource ? (
          <div className="text-center">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">Selecione uma Fonte de Dados</h3>
            <p className="text-sm text-muted-foreground">
              Escolha uma conexão de banco de dados para começar a construir seu relatório.
            </p>
          </div>
        ) : selectedDataSource === 'Vendas Globais' ? (
          // Show mock data fields directly
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Buscar campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="space-y-4">
              {/* Render fields directly for mock data */}
              {dimensionFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Dimensões ({dimensionFields.length})
                  </h3>
                  <div className="space-y-1">
                    {dimensionFields.map((field) => (
                      <div
                        key={field.id}
                        className={`field-item flex items-center p-2 rounded-md text-sm select-none cursor-pointer transition-colors ${
                          selectedWidget 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-grab' 
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        draggable={selectedWidget ? true : false}
                        onClick={() => onFieldClick?.(field)}
                        onDragStart={(e) => {
                          if (!selectedWidget) return;
                          console.log('🎯 Starting drag for field:', field);
                          const dragData = {
                            type: 'field',
                            field: field
                          };
                          e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <div className="w-2 h-2 rounded-full mr-2 bg-green-500"></div>
                        {getFieldIcon(field.dataType)}
                        <span className="truncate flex-1">{field.name.split('.')[1] || field.name}</span>
                        <span className="text-xs text-green-600 opacity-75 ml-1">
                          {field.dataType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metricFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Métricas ({metricFields.length})
                  </h3>
                  <div className="space-y-1">
                    {metricFields.map((field) => (
                      <div
                        key={field.id}
                        className={`field-item flex items-center p-2 rounded-md text-sm select-none cursor-pointer transition-colors ${
                          selectedWidget 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-grab' 
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                        draggable={selectedWidget ? true : false}
                        onClick={() => onFieldClick?.(field)}
                        onDragStart={(e) => {
                          if (!selectedWidget) return;
                          console.log('🎯 Starting drag for field:', field);
                          const dragData = {
                            type: 'field',
                            field: field
                          };
                          e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        <div className="w-2 h-2 rounded-full mr-2 bg-blue-500"></div>
                        {getFieldIcon(field.dataType)}
                        <span className="truncate flex-1">{field.name.split('.')[1] || field.name}</span>
                        <span className="text-xs text-blue-600 opacity-75 ml-1">
                          {field.dataType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedDataSource !== 'Vendas Globais' && tables.length === 0 && isLoadingFields ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando tabelas...</p>
          </div>
        ) : selectedDataSource !== 'Vendas Globais' && tables.length > 0 && !selectedTable ? (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Tabelas Disponíveis</h3>
            <div className="space-y-2">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center p-3 rounded-md border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onTableChange(table.name)}
                >
                  <Database className="w-4 h-4 text-muted-foreground mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{table.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {table.columns?.length || 0} campos disponíveis
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isLoadingFields && selectedTable ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando campos...</p>
          </div>
        ) : dataFields.length > 0 ? (
          <div>
            {/* Back to tables button */}
            {selectedDataSource !== 'Vendas Globais' && selectedTable && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-3 gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleBackToTables}
              >
                <ArrowLeft className="w-3 h-3" />
                Voltar às tabelas
              </Button>
            )}

            {/* Search Fields - Only show when there are fields */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Buscar campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div id="fields-list" className="space-y-4">
              {/* Dimensions */}
              {dimensionFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Dimensões ({dimensionFields.length})
                  </h3>
                  <div className="space-y-1">
                     {dimensionFields.map((field) => (
                       <div
                         key={field.id}
                         className={`field-item flex items-center p-2 rounded-md text-sm select-none cursor-pointer transition-colors ${
                           selectedWidget 
                             ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-grab' 
                             : 'bg-green-50 text-green-700 hover:bg-green-100'
                         }`}
                         draggable={selectedWidget ? true : false}
                         onClick={() => onFieldClick?.(field)}
                         onDragStart={(e) => {
                           if (!selectedWidget) return;
                           console.log('🎯 Starting drag for field:', field);
                           const dragData = {
                             type: 'field',
                             field: field
                           };
                           e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                           e.dataTransfer.effectAllowed = 'copy';
                         }}
                       >
                        <div className={`w-2 h-2 rounded-full mr-2 bg-green-500`}></div>
                        {getFieldIcon(field.dataType)}
                        <span className="truncate flex-1">{field.name.split('.')[1] || field.name}</span>
                        <span className="text-xs text-green-600 opacity-75 ml-1">
                          {field.dataType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {metricFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    Métricas ({metricFields.length})
                  </h3>
                  <div className="space-y-1">
                     {metricFields.map((field) => (
                       <div
                         key={field.id}
                         className={`field-item flex items-center p-2 rounded-md text-sm select-none cursor-pointer transition-colors ${
                           selectedWidget 
                             ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-grab' 
                             : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                         }`}
                         draggable={selectedWidget ? true : false}
                         onClick={() => onFieldClick?.(field)}
                         onDragStart={(e) => {
                           if (!selectedWidget) return;
                           console.log('🎯 Starting drag for field:', field);
                           const dragData = {
                             type: 'field',
                             field: field
                           };
                           e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                           e.dataTransfer.effectAllowed = 'copy';
                         }}
                       >
                        <div className={`w-2 h-2 rounded-full mr-2 bg-blue-500`}></div>
                        {getFieldIcon(field.dataType)}
                        <span className="truncate flex-1">{field.name.split('.')[1] || field.name}</span>
                        <span className="text-xs text-blue-600 opacity-75 ml-1">
                          {field.dataType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty search results */}
              {searchTerm && filteredFields.length === 0 && (
                <div className="text-center py-6">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo encontrado para "{searchTerm}"
                  </p>
                </div>
              )}
            </div>

            {/* Add Calculated Field Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowCalculatedFieldDialog(true)}
              >
                <Plus className="w-4 h-4" />
                Adicionar Campo Calculado
              </Button>
            </div>
          </div>
        ) : selectedDataSource && !isLoadingFields ? (
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">Nenhum Campo Disponível</h3>
            <p className="text-sm text-muted-foreground">
              {selectedDataSource === 'Vendas Globais' 
                ? 'Esta fonte de dados não possui campos configurados.'
                : 'Selecione uma tabela para ver os campos disponíveis.'
              }
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}