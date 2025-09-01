import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { 
  Plus, 
  Save, 
  Eye, 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Table, 
  LineChart,
  AreaChart,
  Hash,
  Calendar,
  Type,
  Trash2,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/hooks/use-toast';
import { BackLink } from '@/components/BackLink';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ChartWidget {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  type: 'bar' | 'line' | 'area' | 'pie' | 'table' | 'kpi';
  title: string;
  dataConfig: {
    dimensions: string[];
    metrics: string[];
    aggregation: 'sum' | 'avg' | 'count' | 'count_distinct';
  };
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout_config: any;
  org_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const chartTypes = [
  { value: 'table', label: 'Tabela', icon: Table },
  { value: 'bar', label: 'Barra', icon: BarChart3 },
  { value: 'line', label: 'Linha', icon: LineChart },
  { value: 'area', label: 'Área', icon: AreaChart },
  { value: 'pie', label: 'Pizza', icon: PieChart },
  { value: 'kpi', label: 'KPI', icon: Hash },
];

const aggregationTypes = [
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'count', label: 'Contagem' },
  { value: 'count_distinct', label: 'Contagem Distinta' },
];

export default function DashboardEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useSession();
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<ChartWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dataFields, setDataFields] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadDashboard();
    }
  }, [id]);

  const loadDashboard = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setDashboard(data);
      
      // Load existing widgets from layout_config
      if (data.layout_config && typeof data.layout_config === 'object' && 'widgets' in data.layout_config) {
        setWidgets((data.layout_config as any).widgets || []);
      }

      // Mock data fields - in real implementation, load from datasource
      setDataFields([
        { name: 'produto', type: 'dimension', dataType: 'text' },
        { name: 'categoria', type: 'dimension', dataType: 'text' },
        { name: 'data_venda', type: 'dimension', dataType: 'date' },
        { name: 'vendas', type: 'metric', dataType: 'number' },
        { name: 'quantidade', type: 'metric', dataType: 'number' },
        { name: 'preco_unitario', type: 'metric', dataType: 'number' },
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDashboard = async () => {
    if (!dashboard) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({
          layout_config: {
            ...dashboard.layout_config,
            widgets: widgets
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', dashboard.id);

      if (error) throw error;

      toast({
        title: "✅ Dashboard salvo",
        description: "Layout atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: "Erro ao salvar",
        description: "Falha ao atualizar dashboard",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addWidget = (type: ChartWidget['type']) => {
    const newWidget: ChartWidget = {
      i: `widget-${Date.now()}`,
      x: 0,
      y: 0,
      w: type === 'kpi' ? 2 : 4,
      h: type === 'table' ? 6 : 4,
      minW: 2,
      minH: 2,
      type,
      title: `Novo ${chartTypes.find(t => t.value === type)?.label}`,
      dataConfig: {
        dimensions: [],
        metrics: [],
        aggregation: 'sum'
      }
    };

    setWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget.i);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.i !== widgetId));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  const updateWidget = (widgetId: string, updates: Partial<ChartWidget>) => {
    setWidgets(prev => prev.map(w => 
      w.i === widgetId ? { ...w, ...updates } : w
    ));
  };

  const onLayoutChange = (layout: any) => {
    setWidgets(prev => prev.map(widget => {
      const layoutItem = layout.find((l: any) => l.i === widget.i);
      return layoutItem ? { ...widget, ...layoutItem } : widget;
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.data.current?.field) {
      const field = active.data.current.field;
      const widgetId = over.id as string;
      const dropZone = over.data.current?.dropZone;
      
      if (dropZone && selectedWidget === widgetId) {
        const widget = widgets.find(w => w.i === widgetId);
        if (widget) {
          const updatedConfig = { ...widget.dataConfig };
          
          if (dropZone === 'dimensions') {
            if (!updatedConfig.dimensions.includes(field.name)) {
              updatedConfig.dimensions = [...updatedConfig.dimensions, field.name];
            }
          } else if (dropZone === 'metrics') {
            if (!updatedConfig.metrics.includes(field.name)) {
              updatedConfig.metrics = [...updatedConfig.metrics, field.name];
            }
          }
          
          updateWidget(widgetId, { dataConfig: updatedConfig });
        }
      }
    }
  };

  const selectedWidgetData = selectedWidget ? widgets.find(w => w.i === selectedWidget) : null;

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando editor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Dashboard não encontrado</h3>
          <BackLink to="/dashboards" />
        </div>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboards')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold">{dashboard.name}</h1>
                <p className="text-sm text-muted-foreground">Editor de Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(`/dashboards/${id}/view`)}>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
              <Button onClick={saveDashboard} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 border-r bg-muted/10 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* Chart Types */}
              <div>
                <h3 className="font-semibold mb-3">Tipos de Gráfico</h3>
                <div className="grid grid-cols-2 gap-2">
                  {chartTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      className="h-auto p-3 flex flex-col gap-1"
                      onClick={() => addWidget(type.value as any)}
                    >
                      <type.icon className="w-4 h-4" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Data Fields */}
              <div>
                <h3 className="font-semibold mb-3">Campos de Dados</h3>
                <div className="space-y-2">
                  {dataFields.map((field) => (
                    <div
                      key={field.name}
                      className="p-2 border rounded cursor-grab flex items-center gap-2 hover:bg-muted/50"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('field', JSON.stringify(field));
                      }}
                    >
                      {field.type === 'dimension' ? (
                        field.dataType === 'date' ? (
                          <Calendar className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Type className="w-4 h-4 text-green-500" />
                        )
                      ) : (
                        <Hash className="w-4 h-4 text-orange-500" />
                      )}
                      <span className="text-sm">{field.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {field.type === 'dimension' ? 'Dim' : 'Métr'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Widget Inspector */}
              {selectedWidgetData && (
                <div>
                  <h3 className="font-semibold mb-3">Configurações</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={selectedWidgetData.title}
                        onChange={(e) => updateWidget(selectedWidget!, { title: e.target.value })}
                        placeholder="Nome do gráfico"
                      />
                    </div>

                    <div>
                      <Label>Agregação</Label>
                      <Select
                        value={selectedWidgetData.dataConfig.aggregation}
                        onValueChange={(value: any) => 
                          updateWidget(selectedWidget!, {
                            dataConfig: { ...selectedWidgetData.dataConfig, aggregation: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aggregationTypes.map(agg => (
                            <SelectItem key={agg.value} value={agg.value}>
                              {agg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Dimensões</Label>
                      <div className="p-2 border rounded min-h-[60px] bg-muted/20"
                           onDrop={(e) => {
                             e.preventDefault();
                             const field = JSON.parse(e.dataTransfer.getData('field'));
                             if (field.type === 'dimension') {
                               const updatedConfig = { ...selectedWidgetData.dataConfig };
                               if (!updatedConfig.dimensions.includes(field.name)) {
                                 updatedConfig.dimensions = [...updatedConfig.dimensions, field.name];
                                 updateWidget(selectedWidget!, { dataConfig: updatedConfig });
                               }
                             }
                           }}
                           onDragOver={(e) => e.preventDefault()}>
                        {selectedWidgetData.dataConfig.dimensions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Arraste dimensões aqui</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedWidgetData.dataConfig.dimensions.map(dim => (
                              <Badge key={dim} variant="secondary" className="text-xs">
                                {dim}
                                <button
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => {
                                    const updatedConfig = { ...selectedWidgetData.dataConfig };
                                    updatedConfig.dimensions = updatedConfig.dimensions.filter(d => d !== dim);
                                    updateWidget(selectedWidget!, { dataConfig: updatedConfig });
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Métricas</Label>
                      <div className="p-2 border rounded min-h-[60px] bg-muted/20"
                           onDrop={(e) => {
                             e.preventDefault();
                             const field = JSON.parse(e.dataTransfer.getData('field'));
                             if (field.type === 'metric') {
                               const updatedConfig = { ...selectedWidgetData.dataConfig };
                               if (!updatedConfig.metrics.includes(field.name)) {
                                 updatedConfig.metrics = [...updatedConfig.metrics, field.name];
                                 updateWidget(selectedWidget!, { dataConfig: updatedConfig });
                               }
                             }
                           }}
                           onDragOver={(e) => e.preventDefault()}>
                        {selectedWidgetData.dataConfig.metrics.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Arraste métricas aqui</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedWidgetData.dataConfig.metrics.map(metric => (
                              <Badge key={metric} variant="secondary" className="text-xs">
                                {metric}
                                <button
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => {
                                    const updatedConfig = { ...selectedWidgetData.dataConfig };
                                    updatedConfig.metrics = updatedConfig.metrics.filter(m => m !== metric);
                                    updateWidget(selectedWidget!, { dataConfig: updatedConfig });
                                  }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeWidget(selectedWidget!)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover Widget
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 p-4 bg-muted/5 overflow-auto">
            {widgets.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Canvas Vazio</h3>
                  <p className="text-muted-foreground mb-4">
                    Adicione gráficos clicando nos tipos na barra lateral
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: widgets }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={60}
                onLayoutChange={onLayoutChange}
                margin={[16, 16]}
                containerPadding={[0, 0]}
              >
                {widgets.map((widget) => (
                  <div 
                    key={widget.i} 
                    className={`bg-background border rounded-lg shadow-sm ${
                      selectedWidget === widget.i ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedWidget(widget.i)}
                  >
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{widget.title}</h4>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {chartTypes.find(t => t.value === widget.type)?.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWidget(widget.i);
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 border rounded p-2 bg-muted/20 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          {widget.type === 'bar' && <BarChart3 className="w-8 h-8 mx-auto mb-1" />}
                          {widget.type === 'line' && <LineChart className="w-8 h-8 mx-auto mb-1" />}
                          {widget.type === 'area' && <AreaChart className="w-8 h-8 mx-auto mb-1" />}
                          {widget.type === 'pie' && <PieChart className="w-8 h-8 mx-auto mb-1" />}
                          {widget.type === 'table' && <Table className="w-8 h-8 mx-auto mb-1" />}
                          {widget.type === 'kpi' && <Hash className="w-8 h-8 mx-auto mb-1" />}
                          <p className="text-xs">
                            {widget.dataConfig.dimensions.length} dim, {widget.dataConfig.metrics.length} métr
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ResponsiveGridLayout>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}