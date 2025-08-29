import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Settings, 
  Palette, 
  Plus, 
  Trash2,
  BarChart3,
  SortAsc,
  Filter,
  Eye,
  EyeOff
} from "lucide-react";

interface DataField {
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
}

interface ChartElement {
  id: string;
  type: 'chart' | 'control' | 'text' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  style: any;
}

interface PropertiesPanelProps {
  element: ChartElement;
  dataFields: DataField[];
  onElementUpdate: (updates: Partial<ChartElement>) => void;
  onClose: () => void;
}

export function PropertiesPanel({
  element,
  dataFields,
  onElementUpdate,
  onClose
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState("config");

  const handleConfigUpdate = (key: string, value: any) => {
    onElementUpdate({
      config: {
        ...element.config,
        [key]: value
      }
    });
  };

  const handleStyleUpdate = (key: string, value: any) => {
    onElementUpdate({
      style: {
        ...element.style,
        [key]: value
      }
    });
  };

  const handleDrop = (event: React.DragEvent, dropZone: string) => {
    event.preventDefault();
    try {
      const fieldData = JSON.parse(event.dataTransfer.getData('application/json'));
      
      if (dropZone === 'dimensions') {
        const currentDimensions = element.config.dimensions || [];
        handleConfigUpdate('dimensions', [...currentDimensions, fieldData]);
      } else if (dropZone === 'metrics') {
        const currentMetrics = element.config.metrics || [];
        handleConfigUpdate('metrics', [...currentMetrics, fieldData]);
      }
    } catch (error) {
      console.error('Error processing dropped field:', error);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeDimension = (index: number) => {
    const dimensions = [...(element.config.dimensions || [])];
    dimensions.splice(index, 1);
    handleConfigUpdate('dimensions', dimensions);
  };

  const removeMetric = (index: number) => {
    const metrics = [...(element.config.metrics || [])];
    metrics.splice(index, 1);
    handleConfigUpdate('metrics', metrics);
  };

  const renderConfigTab = () => {
    if (element.type === 'chart') {
      return (
        <div className="space-y-6">
          {/* Data Source */}
          <div>
            <Label className="text-sm font-medium">Fonte de Dados</Label>
            <Select value={element.config.dataSource || ""} onValueChange={(value) => handleConfigUpdate('dataSource', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connection1">Conexão Principal</SelectItem>
                <SelectItem value="connection2">Conexão Secundária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Dimensions Drop Zone */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Dimensões
            </Label>
            <div
              onDrop={(e) => handleDrop(e, 'dimensions')}
              onDragOver={handleDragOver}
              className="min-h-[80px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 bg-muted/10"
            >
              {element.config.dimensions?.length > 0 ? (
                <div className="space-y-2">
                  {element.config.dimensions.map((dimension: DataField, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-card border rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">{dimension.name.split('.')[1]}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeDimension(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/50 rounded mx-auto mb-2 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-xs">Arraste dimensões aqui</p>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Drop Zone */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Métricas
            </Label>
            <div
              onDrop={(e) => handleDrop(e, 'metrics')}
              onDragOver={handleDragOver}
              className="min-h-[80px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 bg-muted/10"
            >
              {element.config.metrics?.length > 0 ? (
                <div className="space-y-2">
                  {element.config.metrics.map((metric: DataField, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-card border rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">{metric.name.split('.')[1]}</span>
                        <Badge variant="outline" className="text-xs">
                          {element.config.aggregations?.[index] || 'SUM'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Select
                          value={element.config.aggregations?.[index] || 'SUM'}
                          onValueChange={(value) => {
                            const aggregations = [...(element.config.aggregations || [])];
                            aggregations[index] = value;
                            handleConfigUpdate('aggregations', aggregations);
                          }}
                        >
                          <SelectTrigger className="h-6 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SUM">Soma</SelectItem>
                            <SelectItem value="AVG">Média</SelectItem>
                            <SelectItem value="COUNT">Contagem</SelectItem>
                            <SelectItem value="MIN">Mínimo</SelectItem>
                            <SelectItem value="MAX">Máximo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeMetric(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <div className="w-8 h-8 border-2 border-dashed border-muted-foreground/50 rounded mx-auto mb-2 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-xs">Arraste métricas aqui</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Chart Type */}
          <div>
            <Label className="text-sm font-medium">Tipo de Gráfico</Label>
            <Select value={element.config.chartType || "table"} onValueChange={(value) => handleConfigUpdate('chartType', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Tabela</SelectItem>
                <SelectItem value="scorecard">Cartão de Pontuação</SelectItem>
                <SelectItem value="bar">Gráfico de Barras</SelectItem>
                <SelectItem value="line">Gráfico de Linhas</SelectItem>
                <SelectItem value="pie">Gráfico de Pizza</SelectItem>
                <SelectItem value="area">Gráfico de Área</SelectItem>
                <SelectItem value="scatter">Gráfico de Dispersão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <SortAsc className="w-3 h-3" />
              Classificação
            </Label>
            <div className="mt-2 space-y-2">
              <Select value={element.config.sortField || ""} onValueChange={(value) => handleConfigUpdate('sortField', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Campo para ordenação" />
                </SelectTrigger>
                <SelectContent>
                  {[...(element.config.dimensions || []), ...(element.config.metrics || [])].map((field: DataField, index: number) => (
                    <SelectItem key={index} value={field.name}>
                      {field.name.split('.')[1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={element.config.sortDirection || "asc"} onValueChange={(value) => handleConfigUpdate('sortDirection', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Crescente</SelectItem>
                  <SelectItem value="desc">Decrescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chart Filter */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-3 h-3" />
              Filtro do Gráfico
            </Label>
            <Button variant="outline" size="sm" className="mt-2 w-full justify-start">
              <Plus className="w-3 h-3 mr-2" />
              Adicionar filtro
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configurações específicas para {element.type} serão exibidas aqui.
        </p>
      </div>
    );
  };

  const renderStyleTab = () => (
    <div className="space-y-6">
      {/* Background */}
      <div>
        <Label className="text-sm font-medium">Fundo</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.style.backgroundColor || "#ffffff"}
              onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              placeholder="#ffffff"
              value={element.style.backgroundColor || ""}
              onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Border */}
      <div>
        <Label className="text-sm font-medium">Borda</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.style.borderColor || "#e5e7eb"}
              onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              placeholder="#e5e7eb"
              value={element.style.borderColor || ""}
              onChange={(e) => handleStyleUpdate('borderColor', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Espessura: {element.style.borderWidth || 1}px</Label>
            <Slider
              value={[element.style.borderWidth || 1]}
              onValueChange={([value]) => handleStyleUpdate('borderWidth', value)}
              max={5}
              min={0}
              step={1}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Raio: {element.style.borderRadius || 8}px</Label>
            <Slider
              value={[element.style.borderRadius || 8]}
              onValueChange={([value]) => handleStyleUpdate('borderRadius', value)}
              max={20}
              min={0}
              step={1}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Typography */}
      <div>
        <Label className="text-sm font-medium">Tipografia</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Família da Fonte</Label>
            <Select value={element.style.fontFamily || "Inter"} onValueChange={(value) => handleStyleUpdate('fontFamily', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Times">Times</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tamanho: {element.style.fontSize || 14}px</Label>
            <Slider
              value={[element.style.fontSize || 14]}
              onValueChange={([value]) => handleStyleUpdate('fontSize', value)}
              max={24}
              min={8}
              step={1}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.style.textColor || "#000000"}
              onChange={(e) => handleStyleUpdate('textColor', e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              placeholder="#000000"
              value={element.style.textColor || ""}
              onChange={(e) => handleStyleUpdate('textColor', e.target.value)}
            />
          </div>
        </div>
      </div>

      {element.type === 'chart' && (
        <>
          <Separator />

          {/* Chart Specific Styles */}
          <div>
            <Label className="text-sm font-medium">Estilo do Gráfico</Label>
            <div className="mt-2 space-y-3">
              {/* Show/Hide Legend */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar Legenda</Label>
                <Switch
                  checked={element.style.showLegend !== false}
                  onCheckedChange={(checked) => handleStyleUpdate('showLegend', checked)}
                />
              </div>
              
              {/* Show/Hide Axis */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar Eixos</Label>
                <Switch
                  checked={element.style.showAxis !== false}
                  onCheckedChange={(checked) => handleStyleUpdate('showAxis', checked)}
                />
              </div>
              
              {/* Show/Hide Grid */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar Grade</Label>
                <Switch
                  checked={element.style.showGrid !== false}
                  onCheckedChange={(checked) => handleStyleUpdate('showGrid', checked)}
                />
              </div>
              
              {/* Data Labels */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rótulos de Dados</Label>
                <Switch
                  checked={element.style.showDataLabels === true}
                  onCheckedChange={(checked) => handleStyleUpdate('showDataLabels', checked)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Shadow */}
      <div>
        <Label className="text-sm font-medium">Sombra</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Ativar Sombra</Label>
            <Switch
              checked={element.style.hasShadow === true}
              onCheckedChange={(checked) => handleStyleUpdate('hasShadow', checked)}
            />
          </div>
          {element.style.hasShadow && (
            <div>
              <Label className="text-xs text-muted-foreground">Intensidade: {element.style.shadowIntensity || 10}</Label>
              <Slider
                value={[element.style.shadowIntensity || 10]}
                onValueChange={([value]) => handleStyleUpdate('shadowIntensity', value)}
                max={50}
                min={0}
                step={1}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm capitalize">{element.type} - Propriedades</h2>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="config" className="text-xs gap-1">
              <Settings className="w-3 h-3" />
              CONFIGURAÇÃO
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs gap-1">
              <Palette className="w-3 h-3" />
              ESTILO
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="config" className="p-4 m-0">
            {renderConfigTab()}
          </TabsContent>
          
          <TabsContent value="style" className="p-4 m-0">
            {renderStyleTab()}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}