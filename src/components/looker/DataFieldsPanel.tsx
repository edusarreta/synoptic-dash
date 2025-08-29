import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus, 
  Database, 
  Hash, 
  Type, 
  Calendar,
  Loader2
} from "lucide-react";

interface DataField {
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
}

interface DataFieldsPanelProps {
  connections: any[];
  selectedDataSource: string | null;
  dataFields: DataField[];
  isLoadingFields: boolean;
  onDataSourceChange: (connectionId: string) => void;
}

export function DataFieldsPanel({
  connections,
  selectedDataSource,
  dataFields,
  isLoadingFields,
  onDataSourceChange
}: DataFieldsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCalculatedFieldDialog, setShowCalculatedFieldDialog] = useState(false);

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

  const handleFieldDragStart = (event: React.DragEvent, field: DataField) => {
    event.dataTransfer.setData('application/json', JSON.stringify(field));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Campos de Dados</h2>
        </div>
        
        {/* Data Source Selector */}
        <Select value={selectedDataSource || ""} onValueChange={onDataSourceChange}>
          <SelectTrigger className="w-full mb-3">
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

        {/* Search Fields */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Buscar campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!selectedDataSource ? (
          <div className="p-4 text-center text-muted-foreground">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione uma fonte de dados para ver os campos disponíveis</p>
          </div>
        ) : isLoadingFields ? (
          <div className="p-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando campos...</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Add Calculated Field Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setShowCalculatedFieldDialog(true)}
            >
              <Plus className="w-3 h-3" />
              Adicionar campo calculado
            </Button>

            <Separator />

            {/* Dimensions Section */}
            {dimensionFields.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="font-medium text-sm">Dimensões</h3>
                  <Badge variant="secondary" className="text-xs">{dimensionFields.length}</Badge>
                </div>
                
                <div className="space-y-1">
                  {dimensionFields.map((field) => (
                    <div
                      key={field.name}
                      draggable
                      onDragStart={(e) => handleFieldDragStart(e, field)}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing group transition-colors"
                    >
                      <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        {getFieldIcon(field.dataType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{field.name.split('.')[1]}</p>
                        <p className="text-xs text-muted-foreground truncate">{field.table}</p>
                      </div>
                      <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {field.dataType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Section */}
            {metricFields.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h3 className="font-medium text-sm">Métricas</h3>
                  <Badge variant="secondary" className="text-xs">{metricFields.length}</Badge>
                </div>
                
                <div className="space-y-1">
                  {metricFields.map((field) => (
                    <div
                      key={field.name}
                      draggable
                      onDragStart={(e) => handleFieldDragStart(e, field)}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing group transition-colors"
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        {getFieldIcon(field.dataType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{field.name.split('.')[1]}</p>
                        <p className="text-xs text-muted-foreground truncate">{field.table}</p>
                      </div>
                      <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        {field.dataType}
                      </Badge>
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
    </div>
  );
}