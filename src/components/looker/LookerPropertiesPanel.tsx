import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Settings, Palette, Plus, Trash2, Calendar, Clock } from "lucide-react";

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric' | 'time_dimension';
  dataType: string;
  table: string;
  configuredType?: 'text' | 'number' | 'date' | 'datetime' | 'boolean';
}

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: any;
  layout: { x: number; y: number; w: number; h: number };
  style?: any;
}

interface LookerPropertiesPanelProps {
  selectedWidget: Widget | null;
  dataFields: DataField[];
  onWidgetConfigUpdate: (widgetId: number, configUpdates: any) => void;
  onDeselectWidget: () => void;
}

export function LookerPropertiesPanel({
  selectedWidget,
  dataFields,
  onWidgetConfigUpdate,
  onDeselectWidget
}: LookerPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState("setup");

  if (!selectedWidget) {
    return (
      <div className="flex-1 flex flex-col" id="report-properties">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-base">Propriedades do Relatório</h2>
        </div>
        <div className="p-4 flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um elemento no canvas para editar suas propriedades.
          </p>
        </div>
      </div>
    );
  }

  const createMultiDropZone = (
    label: string, 
    acceptedType: 'dimension' | 'metric', 
    configKey: string, 
    currentValues: string[] = [],
    allowMultiple: boolean = true
  ) => {
    return (
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          {allowMultiple && (
            <Badge variant="outline" className="text-xs">
              {currentValues.length} item{currentValues.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Drop Zone */}
        <div
          className={`drop-zone border-2 border-dashed rounded-md min-h-[60px] p-2 bg-muted/10 transition-all ${
            currentValues.length > 0 ? 'border-primary/30' : 'border-muted-foreground/25'
          }`}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
              console.log('📥 Drop data received in properties panel:', dragData);
              console.log('🎯 Expected type:', acceptedType, 'Received type:', dragData.field?.type);
              console.log('🔧 Config key:', configKey, 'Allow multiple:', allowMultiple);
              
              if (dragData.type === 'field' && dragData.field.type === acceptedType) {
                const fieldId = dragData.field.id;
                let newValues;
                
                if (allowMultiple) {
                  // Add to array if not already present
                  newValues = currentValues.includes(fieldId) 
                    ? currentValues 
                    : [...currentValues, fieldId];
                } else {
                  // Replace single value
                  newValues = [fieldId];
                }
                
                console.log('✅ Updating widget config:', {
                  widgetId: selectedWidget.id,
                  configKey,
                  newValues,
                  finalValue: allowMultiple ? newValues : newValues[0]
                });
                
                // Call the update function
                onWidgetConfigUpdate(selectedWidget.id, { 
                  [configKey]: allowMultiple ? newValues : newValues[0],
                  // Ensure aggregation is set for metrics
                  ...(acceptedType === 'metric' && { aggregation: selectedWidget.config.aggregation || 'sum' })
                });
              } else {
                console.warn('❌ Field type mismatch or invalid drop:', {
                  expectedType: acceptedType,
                  receivedType: dragData.field?.type,
                  dragData
                });
              }
            } catch (error) {
              console.error('❌ Error processing dropped field:', error);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-primary/50', 'bg-primary/5');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-primary/50', 'bg-primary/5');
          }}
        >
          {currentValues.length > 0 ? (
            <div className="space-y-1">
              {currentValues.map((fieldId, index) => {
                const field = dataFields.find(f => f.id === fieldId);
                if (!field) return null;
                
                return (
                  <div 
                    key={fieldId}
                    className={`field-item flex items-center justify-between p-2 rounded-md text-sm select-none ${
                      field.type === 'dimension' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                        field.type === 'dimension' ? 'bg-green-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="truncate">{field.name.split('.')[1] || field.name}</span>
                    </div>
                    
                    {/* Field Type Editor */}
                    <div className="flex items-center gap-2 ml-2">
                      <select 
                        className="text-xs bg-background border border-border rounded px-1 py-0.5"
                        value={field.dataType}
                        onChange={(e) => {
                          const newDataType = e.target.value;
                          // Update field data type in dataFields
                          const updatedFields = dataFields.map(f => 
                            f.id === field.id ? { ...f, dataType: newDataType } : f
                          );
                          // You'll need to pass this function down from parent
                          console.log('Updating field type:', field.id, newDataType);
                        }}
                      >
                        <option value="string">Texto</option>
                        <option value="integer">Número</option>
                        <option value="decimal">Decimal</option>
                        <option value="date">Data</option>
                        <option value="datetime">Data/Hora</option>
                        <option value="boolean">Booleano</option>
                      </select>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          let newValues;
                          if (allowMultiple) {
                            newValues = currentValues.filter(id => id !== fieldId);
                          } else {
                            newValues = [];
                          }
                          onWidgetConfigUpdate(selectedWidget.id, { 
                            [configKey]: allowMultiple ? newValues : (newValues[0] || null) 
                          });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm p-4">
              <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/50 rounded mx-auto mb-2 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <p>Arraste {acceptedType === 'dimension' ? 'dimensões' : 'métricas'} aqui</p>
              <p className="text-xs mt-1">ou clique nos campos à esquerda</p>
              {allowMultiple && (
                <p className="text-xs mt-1">Múltiplos itens permitidos</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const createTimeDimensionSelector = () => {
    const timeFields = dataFields.filter(field => 
      field.type === 'dimension' && 
      (field.dataType.toLowerCase().includes('date') || 
       field.dataType.toLowerCase().includes('time') ||
       field.name.toLowerCase().includes('date') ||
       field.name.toLowerCase().includes('time'))
    );
    
    return (
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Dimensão Temporal</p>
        </div>
        
        <div className="space-y-2">
          {timeFields.length > 0 ? (
            timeFields.map(field => (
              <div
                key={field.id}
                className={`field-item flex items-center p-2 rounded-md text-sm cursor-pointer transition-colors border ${
                  selectedWidget.config.timeDimension === field.id
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-muted hover:bg-muted/80 border-border'
                }`}
                onClick={() => {
                  onWidgetConfigUpdate(selectedWidget.id, { 
                    timeDimension: selectedWidget.config.timeDimension === field.id ? null : field.id 
                  });
                }}
              >
                <Calendar className="w-3 h-3 mr-2" />
                <span className="truncate">{field.name.split('.')[1] || field.name}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum campo temporal encontrado</p>
          )}
        </div>
      </div>
    );
  };

  const renderSetupTab = () => {
    if (selectedWidget.type === 'scorecard') {
      return (
        <div>
          {createMultiDropZone('Métrica', 'metric', 'metrics', 
            Array.isArray(selectedWidget.config.metrics) ? selectedWidget.config.metrics : 
            selectedWidget.config.metric ? [selectedWidget.config.metric] : [], false)}
            
          {/* Aggregation Function Selector */}
          <div className="p-4 border-b border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Função de Agregação
            </label>
            <select 
              className="w-full p-2 border border-input rounded-md text-sm bg-background"
              value={selectedWidget.config.aggregation || 'sum'}
              onChange={(e) => onWidgetConfigUpdate(selectedWidget.id, { aggregation: e.target.value })}
            >
              <option value="sum">Somar</option>
              <option value="count">Contar</option>
              <option value="count_distinct">Contar Diferentes</option>
              <option value="avg">Média</option>
              <option value="min">Mínimo</option>
              <option value="max">Máximo</option>
            </select>
          </div>
        </div>
      );
    } else if (selectedWidget.type === 'bar') {
      return (
        <div>
          {createMultiDropZone('Dimensões', 'dimension', 'dimensions', 
            Array.isArray(selectedWidget.config.dimensions) ? selectedWidget.config.dimensions : 
            selectedWidget.config.dimension ? [selectedWidget.config.dimension] : [], true)}
          {createMultiDropZone('Métricas', 'metric', 'metrics', 
            Array.isArray(selectedWidget.config.metrics) ? selectedWidget.config.metrics : 
            selectedWidget.config.metric ? [selectedWidget.config.metric] : [], true)}
          {createTimeDimensionSelector()}
          
          {/* Aggregation Functions for Metrics */}
          <div className="p-4 border-b border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Função de Agregação
            </label>
            <select 
              className="w-full p-2 border border-input rounded-md text-sm bg-background"
              value={selectedWidget.config.aggregation || 'sum'}
              onChange={(e) => onWidgetConfigUpdate(selectedWidget.id, { aggregation: e.target.value })}
            >
              <option value="sum">Somar</option>
              <option value="count">Contar</option>
              <option value="count_distinct">Contar Diferentes</option>
              <option value="avg">Média</option>
              <option value="min">Mínimo</option>
              <option value="max">Máximo</option>
            </select>
          </div>
        </div>
      );
    } else if (selectedWidget.type === 'line') {
      return (
        <div>
          {createMultiDropZone('Dimensões', 'dimension', 'dimensions', 
            Array.isArray(selectedWidget.config.dimensions) ? selectedWidget.config.dimensions : 
            selectedWidget.config.dimension ? [selectedWidget.config.dimension] : [], true)}
          {createMultiDropZone('Métricas', 'metric', 'metrics', 
            Array.isArray(selectedWidget.config.metrics) ? selectedWidget.config.metrics : 
            selectedWidget.config.metric ? [selectedWidget.config.metric] : [], true)}
          {createTimeDimensionSelector()}
        </div>
      );
    } else if (selectedWidget.type === 'pie') {
      return (
        <div>
          {createMultiDropZone('Dimensões', 'dimension', 'dimensions', 
            Array.isArray(selectedWidget.config.dimensions) ? selectedWidget.config.dimensions : 
            selectedWidget.config.dimension ? [selectedWidget.config.dimension] : [], false)}
          {createMultiDropZone('Métricas', 'metric', 'metrics', 
            Array.isArray(selectedWidget.config.metrics) ? selectedWidget.config.metrics : 
            selectedWidget.config.metric ? [selectedWidget.config.metric] : [], false)}
        </div>
      );
    } else if (selectedWidget.type === 'table') {
      return (
        <div>
          {createMultiDropZone('Dimensões', 'dimension', 'dimensions', 
            Array.isArray(selectedWidget.config.dimensions) ? selectedWidget.config.dimensions : 
            selectedWidget.config.dimension ? [selectedWidget.config.dimension] : [], true)}
          {createMultiDropZone('Métricas', 'metric', 'metrics', 
            Array.isArray(selectedWidget.config.metrics) ? selectedWidget.config.metrics : 
            selectedWidget.config.metric ? [selectedWidget.config.metric] : [], true)}
        </div>
      );
    } else if (selectedWidget.type === 'filter') {
      return createMultiDropZone('Campo de Controle', 'dimension', 'dimensions', 
        Array.isArray(selectedWidget.config.dimensions) ? selectedWidget.config.dimensions : 
        selectedWidget.config.dimension ? [selectedWidget.config.dimension] : [], false);
    }
    
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Configurações específicas para {selectedWidget.type} aparecerão aqui.
      </div>
    );
  };

  const renderStyleTab = () => (
    <div className="p-4 text-sm text-muted-foreground">
      Opções de estilo para {selectedWidget.type} aparecerão aqui.
    </div>
  );

  return (
    <div className="flex-1 flex flex-col" id="widget-properties">
      {/* Header */}
      <div className="border-b border-border shrink-0">
        <div className="p-4 flex items-center justify-between">
          <h2 className="font-semibold text-base capitalize">
            {selectedWidget.type} - Propriedades
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDeselectWidget}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Property Tabs */}
        <nav className="flex space-x-2 px-3" id="properties-tabs">
          <button
            className={`property-tab px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'setup' 
                ? 'text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => setActiveTab('setup')}
          >
            CONFIGURAÇÃO
          </button>
          <button
            className={`property-tab px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'style' 
                ? 'text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            onClick={() => setActiveTab('style')}
          >
            ESTILO
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'setup' && (
          <div id="setup-tab-content">
            {renderSetupTab()}
          </div>
        )}
        
        {activeTab === 'style' && (
          <div id="style-tab-content">
            {renderStyleTab()}
          </div>
        )}
      </div>
    </div>
  );
}