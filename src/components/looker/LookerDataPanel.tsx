import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Database, 
  Hash, 
  Type, 
  Calendar,
  Loader2,
  PlusCircle,
  ArrowLeft
} from "lucide-react";

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
}

interface LookerDataPanelProps {
  connections: any[];
  selectedDataSource: string;
  selectedTable: string;
  tables: any[];
  dataFields: DataField[];
  isLoadingFields: boolean;
  onDataSourceChange: (connectionId: string) => void;
  onTableChange: (tableName: string) => void;
}

export function LookerDataPanel({
  connections,
  selectedDataSource,
  selectedTable,
  tables,
  dataFields,
  isLoadingFields,
  onDataSourceChange,
  onTableChange
}: LookerDataPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  console.log('🔍 LookerDataPanel render:', {
    connectionsCount: connections.length,
    selectedDataSource,
    selectedTable,
    tablesCount: tables.length,
    dataFieldsCount: dataFields.length,
    isLoadingFields
  });

  const filteredFields = dataFields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dimensionFields = filteredFields.filter(field => field.type === 'dimension');
  const metricFields = filteredFields.filter(field => field.type === 'metric');

  const getFieldIcon = (dataType: string) => {
    const type = dataType.toLowerCase();
    if (type.includes('text') || type.includes('varchar') || type.includes('char')) {
      return <Type className="w-3 h-3" />;
    }
    if (type.includes('date') || type.includes('time')) {
      return <Calendar className="w-3 h-3" />;
    }
    return <Hash className="w-3 h-3" />;
  };

  const handleBackToTables = () => {
    onTableChange('');
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <h2 className="font-semibold flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Dados
        </h2>
        
        {/* Data Source Selector */}
        <Select value={selectedDataSource} onValueChange={onDataSourceChange}>
          <SelectTrigger className="w-full mt-2">
            <SelectValue placeholder="Selecionar fonte de dados" />
          </SelectTrigger>
          <SelectContent>
            {/* Mock data option first */}
            <SelectItem value="Vendas Globais">
              <div className="flex items-center gap-2">
                <Database className="w-3 h-3" />
                <span>Vendas Globais (Exemplo)</span>
                <Badge variant="outline" className="text-xs">
                  demo
                </Badge>
              </div>
            </SelectItem>
            {connections.filter(conn => conn.id !== 'Vendas Globais').map((connection) => (
              <SelectItem key={connection.id} value={connection.id}>
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3" />
                  <span>{connection.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {connection.connection_type}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Table Selector - Show only if data source is selected and not loading */}
        {selectedDataSource && selectedDataSource !== 'Vendas Globais' && !isLoadingFields && tables.length > 0 && (
          <Select value={selectedTable} onValueChange={onTableChange}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Selecionar tabela" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.name} value={table.name}>
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    <span>{table.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {table.columns?.length || 0} campos
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {!selectedDataSource ? (
          <div className="text-center text-muted-foreground py-8">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione uma fonte de dados</p>
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
        ) : isLoadingFields ? (
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
                        className="field-item flex items-center p-2 rounded-md text-sm select-none bg-green-100 text-green-800 cursor-grab hover:bg-green-200 transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: 'field',
                            field: field
                          }));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        {getFieldIcon(field.dataType)}
                        <span className="ml-2 truncate">{field.name.split('.')[1] || field.name}</span>
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
                        className="field-item flex items-center p-2 rounded-md text-sm select-none bg-blue-100 text-blue-800 cursor-grab hover:bg-blue-200 transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: 'field',
                            field: field
                          }));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                      >
                        {getFieldIcon(field.dataType)}
                        <span className="ml-2 truncate">{field.name.split('.')[1] || field.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State for Search */}
              {filteredFields.length === 0 && searchTerm && (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum campo encontrado para "{searchTerm}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : selectedDataSource !== 'Vendas Globais' && selectedTable ? (
          <div className="text-center py-8">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">
              Nenhum campo encontrado na tabela "{selectedTable}"
            </p>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <Button variant="ghost" className="w-full justify-center gap-2 text-primary hover:bg-primary/10">
          <PlusCircle className="w-4 h-4" />
          Adicionar um Campo
        </Button>
      </div>
    </div>
  );
}