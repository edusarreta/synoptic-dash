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
  PlusCircle
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
  dataFields: DataField[];
  isLoadingFields: boolean;
  onDataSourceChange: (connectionId: string) => void;
}

export function LookerDataPanel({
  connections,
  selectedDataSource,
  dataFields,
  isLoadingFields,
  onDataSourceChange
}: LookerDataPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

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
            {connections.map((connection) => (
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {/* Search Fields */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Buscar campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {!selectedDataSource ? (
          <div className="text-center text-muted-foreground py-8">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione uma fonte de dados</p>
          </div>
        ) : isLoadingFields ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando campos...</p>
          </div>
        ) : (
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

            {/* Empty State */}
            {filteredFields.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">
                  Nenhum campo encontrado para "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        )}
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