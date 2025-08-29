import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Settings, Palette, Plus, Trash2 } from "lucide-react";

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
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

  const createDropZone = (label: string, acceptedType: 'dimension' | 'metric', currentFieldId?: string) => {
    const field = currentFieldId ? dataFields.find(f => f.id === currentFieldId) : null;
    
    return (
      <div className="p-4 border-b border-border">
        <p className="text-sm font-semibold mb-2 text-muted-foreground">{label}</p>
        <div
          className="drop-zone border-2 border-dashed border-muted-foreground/25 rounded-md min-h-[60px] p-1 bg-muted/10"
          onDrop={(e) => {
            e.preventDefault();
            try {
              const fieldData = JSON.parse(e.dataTransfer.getData('application/json'));
              if (fieldData.type === acceptedType) {
                const propertyName = label.toLowerCase().includes('dimensão') ? 'dimension' : 
                                   label.toLowerCase().includes('métrica') ? 'metric' : 'dimension';
                onWidgetConfigUpdate(selectedWidget.id, { [propertyName]: fieldData.id });
              }
            } catch (error) {
              console.error('Error processing dropped field:', error);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          {field ? (
            <div className={`field-item flex items-center p-2 rounded-md text-sm select-none ${
              field.type === 'dimension' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                field.type === 'dimension' ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <span className="truncate">{field.name.split('.')[1] || field.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  const propertyName = label.toLowerCase().includes('dimensão') ? 'dimension' : 
                                     label.toLowerCase().includes('métrica') ? 'metric' : 'dimension';
                  onWidgetConfigUpdate(selectedWidget.id, { [propertyName]: null });
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm p-4">
              <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/50 rounded mx-auto mb-2 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <p>Arraste {acceptedType === 'dimension' ? 'uma dimensão' : 'uma métrica'} aqui</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSetupTab = () => {
    let content = '';
    
    if (selectedWidget.type === 'scorecard') {
      return createDropZone('Métrica', 'metric', selectedWidget.config.metric);
    } else if (selectedWidget.type === 'bar') {
      return (
        <div>
          {createDropZone('Dimensão', 'dimension', selectedWidget.config.dimension)}
          {createDropZone('Métrica', 'metric', selectedWidget.config.metric)}
        </div>
      );
    } else if (selectedWidget.type === 'filter') {
      return createDropZone('Campo de Controle', 'dimension', selectedWidget.config.dimension);
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