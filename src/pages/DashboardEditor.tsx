import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { DndContext, DragEndEvent, closestCenter, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Save, 
  Eye, 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Table, 
  LineChart,
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
import { useEditorStore } from '@/modules/dashboards/editor/state/editorStore';
import { WidgetRenderer } from '@/modules/dashboards/editor/components/WidgetRenderer';
import { useDatasets } from '@/hooks/useDatasets';
import type { ChartType, Agg } from '@/modules/dashboards/editor/state/editorStore';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Dataset {
  id: string;
  name: string;
  description?: string;
  org_id?: string;
  saved_query_id?: string;
  data_schema?: any;
  columns?: Array<{ name: string; type: string }>;
  connection_id?: string;
  type?: 'dataset' | 'saved_query';
  source_type?: string;
  sql_query?: string;
}

interface DataField {
  name: string;
  type: 'dimension' | 'metric';
  dataType: 'text' | 'number' | 'date' | 'datetime';
}

// Draggable Field Component
function DraggableField({ field }: { field: DataField }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-${field.name}`,
    data: { field }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 border rounded cursor-grab flex items-center gap-2 hover:bg-muted/50 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {field.type === 'dimension' ? (
        field.dataType === 'date' || field.dataType === 'datetime' ? (
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
  );
}

// Droppable Widget Component
const DroppableWidget = React.forwardRef<
  HTMLDivElement, 
  { widget: any; children: React.ReactNode; onClick: () => void; }
>(({ widget, children, onClick }, ref) => {
  const { setNodeRef, isOver } = useDroppable({
    id: widget.id
  });

  const combinedRef = React.useCallback((node: HTMLDivElement) => {
    setNodeRef(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [setNodeRef, ref]);

  return (
    <div 
      ref={combinedRef}
      className={`bg-background border rounded-lg shadow-sm ${
        isOver ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

DroppableWidget.displayName = 'DroppableWidget';

const chartTypes = [
  { value: 'table', label: 'Tabela', icon: Table },
  { value: 'bar', label: 'Barra', icon: BarChart3 },
  { value: 'line', label: 'Linha', icon: LineChart },
  { value: 'pie', label: 'Pizza', icon: PieChart },
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

  // Use the new editor store
  const { 
    id: dashboardId,
    name, 
    widgets, 
    selectedWidgetId, 
    selectedDatasetId, 
    loadDashboard, 
    saveDashboard, 
    setSelectedDataset,
    addWidget, 
    removeWidget, 
    updateWidget, 
    selectWidget, 
    updateLayout,
  } = useEditorStore();

  // Use the external datasets hook instead of the store's datasets
  const { datasets, isLoading: loadingDatasets, error: datasetsError, refetch: refetchDatasets } = useDatasets(userProfile?.org_id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (id && userProfile?.org_id) {
      initializeDashboard();
    }
  }, [id, userProfile?.org_id]);


  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      if (!userProfile?.org_id) {
        toast({
          title: "Erro",
          description: "Organização não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Set current org_id for dataset loading
      setCurrentOrgId(userProfile.org_id);

      console.log('=== Dashboard Editor Initialization ===');
      console.log('Loading dashboard...');
      
      // Load dashboard data
      const dashboardData = await supabase.from('dashboards').select('*').eq('id', id).single();

      if (dashboardData.error) throw dashboardData.error;
      
      // Load dashboard into store
      loadDashboard({ ...dashboardData.data, id: id! });

      console.log('Dashboard loaded into store');
      
      // Datasets will be loaded automatically by the useDatasets hook

      // Clear data fields until a dataset is selected
      setDataFields([]);
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

  const handleSave = async () => {
    if (!dashboardId) return;

    setSaving(true);
    try {
      await saveDashboard();
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

  const handleAddWidget = (type: ChartType) => {
    if (!selectedDatasetId) {
      toast({
        title: "Selecione um dataset",
        description: "Escolha um dataset antes de adicionar widgets",
        variant: "destructive",
      });
      return;
    }
    
    addWidget(type);
  };

  const handleSelectDataset = async (datasetId: string) => {
    const dataset = datasets.find(d => d.id === datasetId);
    
    if (dataset) {
      // Set dataset in the store with connection info and source
      setSelectedDataset(
        datasetId, 
        dataset.connection_id, 
        { kind: 'dataset', datasetId }
      );
      
      console.log('Dataset selected:', dataset.name, 'connection:', dataset.connection_id);
      
      // Load dataset fields for the field picker
      try {
        const { data, error } = await supabase.functions.invoke('datasets-preview', {
          body: {
            dataset_id: datasetId,
            org_id: currentOrgId,
            limit: 1,
            offset: 0
          }
        });

        if (error) {
          throw new Error(error.message || 'Falha ao carregar campos do dataset');
        }

        // Convert columns to data fields
        const fields: DataField[] = (data.columns || []).map((col: any) => {
          const dataType = inferDataType(col.type || 'unknown');
          const type = dataType === 'number' ? 'metric' : 'dimension';
          
          return {
            name: col.name,
            type,
            dataType
          };
        });

        setDataFields(fields);
        console.log('Dataset fields loaded:', fields.length);
      } catch (error) {
        console.error('Error loading dataset fields:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar campos do dataset",
          variant: "destructive",
        });
        // Keep mock fields as fallback
        setDataFields([
          { name: 'produto', type: 'dimension', dataType: 'text' },
          { name: 'categoria', type: 'dimension', dataType: 'text' },
          { name: 'data_venda', type: 'dimension', dataType: 'date' },
          { name: 'vendas', type: 'metric', dataType: 'number' },
          { name: 'quantidade', type: 'metric', dataType: 'number' },
          { name: 'preco_unitario', type: 'metric', dataType: 'number' },
        ]);
      }
    }
  };

  const inferDataType = (sqlType: string): 'text' | 'number' | 'date' | 'datetime' => {
    const type = sqlType.toLowerCase();
    
    if (type.includes('int') || type.includes('decimal') || type.includes('numeric') || 
        type.includes('float') || type.includes('double') || type.includes('real')) {
      return 'number';
    }
    
    if (type.includes('date') && type.includes('time')) {
      return 'datetime';
    }
    
    if (type.includes('date')) {
      return 'date';
    }
    
    return 'text';
  };

  const handleLayoutChange = (layout: any) => {
    updateLayout('lg', layout);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.data.current?.field) {
      const field = active.data.current.field;
      const widgetId = over.id as string;
      
      // Select the widget first, then add the field
      selectWidget(widgetId);
      
      if (field.type === 'dimension') {
        const { addDimension } = useEditorStore.getState();
        addDimension(field.name, field.dataType);
      } else if (field.type === 'metric') {
        const { addMetric } = useEditorStore.getState();
        const agg: Agg = field.dataType === 'number' ? 'sum' : 'count';
        addMetric(field.name, agg);
      }
      
      console.log('Field added to widget:', field.name, 'type:', field.type, 'widget:', widgetId);
    }
  };

  const selectedWidgetData = selectedWidgetId ? widgets.find(w => w.id === selectedWidgetId) : null;

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

  if (!dashboardId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Dashboard não encontrado</h3>
          <Button variant="outline" onClick={() => navigate('/dashboards')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
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
                <h1 className="text-xl font-bold">{name}</h1>
                <p className="text-sm text-muted-foreground">Editor de Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(`/dashboards/${id}/view`)}>
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
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
              {/* Dataset Selection */}
              <div>
                <Label>Dataset</Label>
                <Select value={selectedDatasetId} onValueChange={handleSelectDataset}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={loadingDatasets ? "Carregando..." : "Selecione um dataset"} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md z-[100]">
                    {loadingDatasets ? (
                      <SelectItem value="loading" disabled>
                        Carregando datasets...
                      </SelectItem>
                    ) : datasets.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground flex flex-col gap-2">
                        <span>Nenhum dataset ainda</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigate('/data-hub/sql?from=dashboard&return=' + encodeURIComponent(window.location.pathname))}
                        >
                          Criar Dataset
                        </Button>
                      </div>
                    ) : datasetsError ? (
                      <div className="p-2 text-sm text-destructive flex flex-col gap-2">
                        <span>Erro ao carregar datasets</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => refetchDatasets()}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    ) : (
                      datasets.map((dataset) => (
                         <SelectItem key={dataset.id} value={dataset.id}>
                            <div className="flex items-center gap-2">
                              <span>{dataset.name}</span>
                              <Badge 
                                variant={dataset.type === 'dataset' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {dataset.type === 'dataset' ? 'Dataset' : 'Query'}
                              </Badge>
                              {dataset.columns && Array.isArray(dataset.columns) && dataset.columns.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {dataset.columns.length} col.
                                </Badge>
                              )}
                            </div>
                         </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Debug: {datasets.length} total items, loading: {loadingDatasets ? 'sim' : 'não'}
                    {datasets.length > 0 && (
                      <div>
                        Datasets: {datasets.filter(d => d.type === 'dataset').length}, 
                        Queries: {datasets.filter(d => d.type === 'saved_query').length}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      onClick={() => handleAddWidget(type.value as ChartType)}
                      disabled={!selectedDatasetId}
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
                 {!selectedDatasetId ? (
                   <div className="text-center p-4 text-muted-foreground">
                     <p className="text-sm">Selecione um dataset para ver os campos disponíveis</p>
                   </div>
                 ) : dataFields.length === 0 ? (
                   <div className="text-center p-4 text-muted-foreground">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                     <p className="text-sm">Carregando campos...</p>
                   </div>
                 ) : (
                   <div className="space-y-2">
                      {dataFields.map((field) => (
                        <DraggableField key={field.name} field={field} />
                      ))}
                    </div>
                  )}
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
                        onChange={(e) => updateWidget(selectedWidgetId!, { title: e.target.value })}
                        placeholder="Nome do gráfico"
                      />
                    </div>

                    <div>
                      <Label>Dimensões</Label>
                      <div className="p-2 border rounded min-h-[60px] bg-muted/20">
                        {selectedWidgetData.query.dims.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Arraste dimensões aqui</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedWidgetData.query.dims.map(dim => (
                              <Badge key={dim.field} variant="secondary" className="text-xs">
                                {dim.field}
                                <button
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => {
                                    const newDims = selectedWidgetData.query.dims.filter(d => d.field !== dim.field);
                                    const { removeDimension } = useEditorStore.getState();
                                    selectWidget(selectedWidgetId!);
                                    removeDimension(dim.field);
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
                      <div className="p-2 border rounded min-h-[60px] bg-muted/20">
                        {selectedWidgetData.query.mets.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Arraste métricas aqui</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedWidgetData.query.mets.map(met => (
                              <Badge key={met.field} variant="secondary" className="text-xs">
                                {met.field} ({met.agg})
                                <button
                                  className="ml-1 hover:text-destructive"
                                  onClick={() => {
                                    const newMets = selectedWidgetData.query.mets.filter(m => m.field !== met.field);
                                    const { removeMetric } = useEditorStore.getState();
                                    selectWidget(selectedWidgetId!);
                                    removeMetric(met.field);
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
                      onClick={() => removeWidget(selectedWidgetId!)}
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
            {!selectedDatasetId ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione um Dataset</h3>
                  <p className="text-muted-foreground mb-4">
                    Escolha um dataset na barra lateral para começar a criar gráficos
                  </p>
                </div>
              </div>
            ) : widgets.length === 0 ? (
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
                layouts={{ lg: widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h })) }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={60}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16]}
                containerPadding={[0, 0]}
              >
                {widgets.map((widget) => (
                  <DroppableWidget 
                    key={widget.id} 
                    widget={widget}
                    onClick={() => selectWidget(widget.id)}
                  >
                    <div className={`p-3 h-full flex flex-col ${
                      selectedWidgetId === widget.id ? 'ring-2 ring-primary' : ''
                    }`}>
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
                              selectWidget(widget.id);
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-h-[220px]">
                        <WidgetRenderer widget={widget} />
                      </div>
                    </div>
                  </DroppableWidget>
                ))}
              </ResponsiveGridLayout>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
