import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, Settings, Palette } from "lucide-react";
import { ControlConfiguration } from "./ControlTypes";

interface ControlConfigPanelProps {
  control: ControlConfiguration;
  availableDataSources: any[];
  onUpdate: (control: ControlConfiguration) => void;
  onClose: () => void;
}

export function ControlConfigPanel({
  control,
  availableDataSources,
  onUpdate,
  onClose
}: ControlConfigPanelProps) {
  const [activeTab, setActiveTab] = useState('config');

  const handleControlUpdate = (updates: Partial<ControlConfiguration>) => {
    onUpdate({
      ...control,
      ...updates
    });
  };

  const handleStyleUpdate = (styleUpdates: any) => {
    onUpdate({
      ...control,
      style: {
        ...control.style,
        ...styleUpdates
      }
    });
  };

  const getAvailableFields = () => {
    if (!control.dataSource) return [];
    
    // Mock fields - in real implementation, these would come from the data source
    return [
      { name: 'country', type: 'text', label: 'País' },
      { name: 'product_category', type: 'text', label: 'Categoria do Produto' },
      { name: 'sales_amount', type: 'number', label: 'Valor de Vendas' },
      { name: 'order_date', type: 'date', label: 'Data do Pedido' },
      { name: 'is_active', type: 'boolean', label: 'Ativo' }
    ];
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Configurações do Controle</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            CONFIGURAÇÃO
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            ESTILO
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Data Source */}
          <div className="space-y-2">
            <Label>Fonte de Dados</Label>
            <Select
              value={control.dataSource}
              onValueChange={(value) => handleControlUpdate({ dataSource: value, field: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fonte de dados" />
              </SelectTrigger>
              <SelectContent>
                {availableDataSources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          {control.dataSource && (
            <div className="space-y-2">
              <Label>Campo de Controle</Label>
              <Select
                value={control.field}
                onValueChange={(value) => handleControlUpdate({ field: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFields().map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label} ({field.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Metric Field (Optional) */}
          {control.dataSource && (
            <div className="space-y-2">
              <Label>Métrica (Opcional)</Label>
              <Select
                value={control.metric || ''}
                onValueChange={(value) => handleControlUpdate({ metric: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma métrica selecionada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {getAvailableFields()
                    .filter(field => field.type === 'number')
                    .map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        COUNT({field.label})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type-specific configurations */}
          {control.type === 'dropdown' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={control.isMultiSelect || false}
                  onCheckedChange={(checked) => handleControlUpdate({ isMultiSelect: checked })}
                />
                <Label>Seleção Múltipla</Label>
              </div>
            </div>
          )}

          {control.type === 'advanced-filter' && (
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select
                value={control.condition || 'contains'}
                onValueChange={(value: any) => handleControlUpdate({ condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="starts_with">Começa com</SelectItem>
                  <SelectItem value="ends_with">Termina com</SelectItem>
                  <SelectItem value="regex">Expressão Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Default Value */}
          <div className="space-y-2">
            <Label>Valor Padrão</Label>
            <Input
              value={control.defaultValue || ''}
              onChange={(e) => handleControlUpdate({ defaultValue: e.target.value })}
              placeholder="Valor padrão (opcional)"
            />
          </div>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Label Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Rótulo do Controle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto do Rótulo</Label>
                <Input
                  value={control.style.label.text}
                  onChange={(e) => handleStyleUpdate({
                    label: { ...control.style.label, text: e.target.value }
                  })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={control.style.label.visible}
                  onCheckedChange={(checked) => handleStyleUpdate({
                    label: { ...control.style.label, visible: checked }
                  })}
                />
                <Label>Mostrar Rótulo</Label>
              </div>

              <div className="space-y-2">
                <Label>Tamanho da Fonte: {control.style.label.fontSize}px</Label>
                <Slider
                  value={[control.style.label.fontSize]}
                  onValueChange={([value]) => handleStyleUpdate({
                    label: { ...control.style.label, fontSize: value }
                  })}
                  min={10}
                  max={24}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor do Texto</Label>
                <Input
                  type="color"
                  value={control.style.label.color}
                  onChange={(e) => handleStyleUpdate({
                    label: { ...control.style.label, color: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Alinhamento</Label>
                <Select
                  value={control.style.label.alignment}
                  onValueChange={(value: any) => handleStyleUpdate({
                    label: { ...control.style.label, alignment: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Container Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Corpo do Controle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cor de Fundo</Label>
                <Input
                  type="color"
                  value={control.style.container.backgroundColor}
                  onChange={(e) => handleStyleUpdate({
                    container: { ...control.style.container, backgroundColor: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor da Borda</Label>
                <Input
                  type="color"
                  value={control.style.container.borderColor}
                  onChange={(e) => handleStyleUpdate({
                    container: { ...control.style.container, borderColor: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Raio da Borda: {control.style.container.borderRadius}px</Label>
                <Slider
                  value={[control.style.container.borderRadius]}
                  onValueChange={([value]) => handleStyleUpdate({
                    container: { ...control.style.container, borderRadius: value }
                  })}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Options Settings */}
          {(control.type === 'dropdown' || control.type === 'advanced-filter') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Opções do Filtro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <Input
                    type="color"
                    value={control.style.options.textColor}
                    onChange={(e) => handleStyleUpdate({
                      options: { ...control.style.options, textColor: e.target.value }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fundo ao Passar o Mouse</Label>
                  <Input
                    type="color"
                    value={control.style.options.hoverBackground}
                    onChange={(e) => handleStyleUpdate({
                      options: { ...control.style.options, hoverBackground: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}