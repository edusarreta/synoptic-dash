import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDatabase } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  Play, 
  Plus, 
  BarChart3, 
  Filter, 
  Share2,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverEvent } from '@dnd-kit/core';

// Import adapted components
import { LookerCanvasGrid } from "@/components/looker/LookerCanvasGrid";
import { LookerDataPanel } from "@/components/looker/LookerDataPanel";
import { LookerPropertiesPanel } from "@/components/looker/LookerPropertiesPanel";

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric';
  dataType: string;
  table: string;
}

interface WidgetConfig {
  dimension?: string;
  metric?: string;
  dimensions?: string[];
  metrics?: string[];
  timeDimension?: string;
  chartType?: string;
  aggregation?: string;
}

interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: WidgetConfig;
  layout: WidgetLayout;
  style?: any;
}

// Mock data for demonstration
const MOCK_DATA = {
  'Vendas Globais': {
    fields: [
      { id: 'pais', name: 'País', type: 'dimension' as const, dataType: 'text', table: 'vendas' },
      { id: 'categoria', name: 'Categoria', type: 'dimension' as const, dataType: 'text', table: 'vendas' },
      { id: 'data', name: 'Data', type: 'dimension' as const, dataType: 'date', table: 'vendas' },
      { id: 'vendas', name: 'Vendas', type: 'metric' as const, dataType: 'numeric', table: 'vendas' },
      { id: 'lucro', name: 'Lucro', type: 'metric' as const, dataType: 'numeric', table: 'vendas' },
      { id: 'unidades', name: 'Unidades Vendidas', type: 'metric' as const, dataType: 'numeric', table: 'vendas' },
    ],
    records: [
      { pais: 'Brasil', categoria: 'Eletrônicos', vendas: 1200, lucro: 250, unidades: 50, data: '2024-01-01' },
      { pais: 'Brasil', categoria: 'Móveis', vendas: 800, lucro: 150, unidades: 20, data: '2024-01-02' },
      { pais: 'EUA', categoria: 'Eletrônicos', vendas: 2500, lucro: 500, unidades: 100, data: '2024-01-03' },
      { pais: 'EUA', categoria: 'Móveis', vendas: 1500, lucro: 300, unidades: 40, data: '2024-01-04' },
      { pais: 'Alemanha', categoria: 'Eletrônicos', vendas: 1800, lucro: 400, unidades: 80, data: '2024-01-05' },
      { pais: 'Alemanha', categoria: 'Móveis', vendas: 1100, lucro: 220, unidades: 35, data: '2024-01-06' },
      { pais: 'Brasil', categoria: 'Roupas', vendas: 600, lucro: 100, unidades: 120, data: '2024-01-07' },
      { pais: 'EUA', categoria: 'Roupas', vendas: 900, lucro: 180, unidades: 150, data: '2024-01-08' },
      { pais: 'Alemanha', categoria: 'Roupas', vendas: 750, lucro: 130, unidades: 110, data: '2024-01-09' },
    ]
  }
};

export default function LookerDashboardBuilder() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const { connections, loadConnections } = useDatabase();
  
  // Dashboard State
  const [dashboardName, setDashboardName] = useState("Meu Relatório Interativo");
  const [isSaving, setIsSaving] = useState(false);
  
  // Data State
  const [selectedDataSource, setSelectedDataSource] = useState<string>('Vendas Globais');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>(MOCK_DATA['Vendas Globais'].fields);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  
  // Widget State with example data
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 1,
      type: 'scorecard',
      config: { 
        metrics: ['vendas'],
        aggregation: 'sum'
      },
      layout: { x: 1, y: 1, w: 3, h: 2 }
    },
    {
      id: 2,
      type: 'bar',
      config: { 
        dimensions: ['pais'],
        metrics: ['vendas'],
        aggregation: 'sum'
      },
      layout: { x: 5, y: 1, w: 6, h: 4 }
    }
  ]);
  const [selectedWidget, setSelectedWidget] = useState<number | null>(null);
  
  // Add proper handleDragEnd function
  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🎯 Drag ended:', event);
    // Handle widget reordering or other drag end logic here
  };

  // Initialize data sources
  const dataSources = [
    { id: 'Vendas Globais', name: 'Vendas Globais (Mock)', type: 'mock' },
    ...connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      type: conn.connection_type
    }))
  ];

  useEffect(() => {
    if (connections.length === 0) {
      loadConnections();
    }
  }, [connections.length, loadConnections]);

  const loadTables = async (connectionId: string) => {
    if (!connectionId || connectionId === 'Vendas Globais') return;
    
    setIsLoadingFields(true);
    try {
      console.log('🔄 Loading tables for connection:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });

      if (error) throw error;
      
      console.log('📊 Tables loaded:', data);
      setTables(data.tables || []);
    } catch (error: any) {
      console.error('❌ Error loading tables:', error);
      toast.error(`Erro ao carregar tabelas: ${error.message}`);
      setTables([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const loadTableFields = async (tableName: string) => {
    if (!tableName || !selectedDataSource) return;
    
    setIsLoadingFields(true);
    setDataFields([]); // Clear existing fields
    
    try {
      console.log('🔄 Loading fields for table:', tableName, 'in connection:', selectedDataSource);
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId: selectedDataSource }
      });

      if (error) throw error;
      
      console.log('📊 Raw schema data:', data);
      
      // Find the specific table in the schema
      const table = data.tables?.find((t: any) => t.name === tableName);
      if (!table || !table.columns) {
        throw new Error(`Table ${tableName} not found in schema`);
      }
      
      // Process fields to match our DataField interface with better type detection
      const processedFields: DataField[] = table.columns?.map((field: any) => {
        const fieldType = field.dataType?.toLowerCase() || '';
        const fieldName = field.name?.toLowerCase() || '';
        
        // Better logic for determining if field is dimension or metric
        const isMetric = 
          fieldType.includes('int') || 
          fieldType.includes('decimal') || 
          fieldType.includes('float') || 
          fieldType.includes('numeric') || 
          fieldType.includes('real') || 
          fieldType.includes('double') ||
          fieldName.includes('amount') ||
          fieldName.includes('price') ||
          fieldName.includes('cost') ||
          fieldName.includes('total') ||
          fieldName.includes('count') ||
          fieldName.includes('sum') ||
          fieldName.includes('value') ||
          fieldName.includes('vendas') ||
          fieldName.includes('valor');
        
        return {
          id: `${tableName}.${field.name}`,
          name: `${tableName}.${field.name}`,
          type: isMetric ? 'metric' as const : 'dimension' as const,
          dataType: field.dataType || 'unknown',
          table: tableName
        };
      }) || [];
      
      console.log('📊 Processed fields:', processedFields);
      setDataFields(processedFields);
    } catch (error: any) {
      console.error('❌ Error loading table fields:', error);
      toast.error(`Erro ao carregar campos da tabela: ${error.message}`);
      setDataFields([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleDataSourceChange = (connectionId: string) => {
    console.log('🔄 Data source changed to:', connectionId);
    setSelectedDataSource(connectionId);
    setSelectedTable('');
    setDataFields([]);
    
    if (connectionId === 'Vendas Globais') {
      setTables([]);
      setDataFields(MOCK_DATA['Vendas Globais'].fields);
      setIsLoadingFields(false);
    } else if (connectionId) {
      loadTables(connectionId);
    } else {
      setTables([]);
      setDataFields([]);
      setIsLoadingFields(false);
    }
  };

  const handleTableChange = (tableName: string) => {
    console.log('🔄 Table changed to:', tableName);
    setSelectedTable(tableName);
    if (tableName) {
      loadTableFields(tableName);
    } else {
      setDataFields([]);
    }
  };

  const processDataForWidget = (widget: Widget) => {
    console.log('🔄 Processing data for widget:', widget.type, widget.config);
    
    if (widget.type === 'scorecard') {
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                      widget.config.metric ? [widget.config.metric] : [];
      
      if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
      
      const metric = metrics[0];
      const field = dataFields.find(f => f.id === metric);
      const metricName = field?.name?.split('.')[1] || metric.split('.')[1] || metric;
      const aggregation = widget.config.aggregation || 'sum';
      
      if (selectedDataSource === 'Vendas Globais') {
        const source = MOCK_DATA[selectedDataSource];
        let result = 0;
        
        switch (aggregation) {
          case 'sum':
            result = source.records.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0);
            break;
          case 'count':
            result = source.records.length;
            break;
          case 'count_distinct':
            result = new Set(source.records.map(record => record[metric])).size;
            break;
          case 'avg':
            result = source.records.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0) / source.records.length;
            break;
          case 'min':
            result = Math.min(...source.records.map(record => record[metric] || 0));
            break;
          case 'max':
            result = Math.max(...source.records.map(record => record[metric] || 0));
            break;
        }
        
        return { 
          label: `${metricName} (${aggregation})`, 
          value: Math.round(result * 100) / 100 
        };
      } else {
        // Generate realistic mock data based on aggregation type
        let mockValue;
        switch (aggregation) {
          case 'count':
          case 'count_distinct':
            mockValue = Math.floor(Math.random() * 1000) + 100;
            break;
          case 'avg':
            mockValue = Math.floor(Math.random() * 100) + 10;
            break;
          default:
            mockValue = Math.floor(Math.random() * 50000) + 1000;
        }
        
        return {
          value: mockValue,
          label: `${metricName.charAt(0).toUpperCase() + metricName.slice(1).replace(/_/g, ' ')} (${aggregation})`
        };
      }
    }
    
    if (widget.type === 'bar') {
      const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                        widget.config.dimension ? [widget.config.dimension] : [];
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                     widget.config.metric ? [widget.config.metric] : [];
      
      if (dimensions.length === 0 || metrics.length === 0) {
        return { labels: [], values: [], datasets: [] };
      }
      
      const dimension = dimensions[0];
      const dimensionField = dataFields.find(f => f.id === dimension);
      const dimensionName = dimensionField?.name?.split('.')[1] || dimension.split('.')[1] || dimension;
      
      if (selectedDataSource === 'Vendas Globais') {
        const source = MOCK_DATA[selectedDataSource];
        const metric = metrics[0];
        
        const grouped = source.records.reduce((acc: any, record: any) => {
          const key = record[dimension];
          if (!acc[key]) acc[key] = 0;
          acc[key] += record[metric];
          return acc;
        }, {});
        
        const metricField = source.fields.find(f => f.id === metric);
        return {
          labels: Object.keys(grouped),
          values: Object.values(grouped),
          metricLabel: metricField?.name || 'Métrica'
        };
      } else {
        // Generate realistic data based on field types
        let labels = [];
        
        // Generate appropriate labels based on dimension type
        if (dimensionName.toLowerCase().includes('month') || dimensionName.toLowerCase().includes('mes')) {
          labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        } else if (dimensionName.toLowerCase().includes('country') || dimensionName.toLowerCase().includes('pais')) {
          labels = ['Brasil', 'EUA', 'México', 'Argentina', 'Chile'];
        } else if (dimensionName.toLowerCase().includes('region') || dimensionName.toLowerCase().includes('regiao')) {
          labels = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'];
        } else if (dimensionName.toLowerCase().includes('category') || dimensionName.toLowerCase().includes('categoria')) {
          labels = ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'];
        } else {
          labels = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
        }
        
        if (metrics.length === 1) {
          const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
          const metricField = dataFields.find(f => f.id === metrics[0]);
          const metricName = metricField?.name?.split('.')[1] || metrics[0].split('.')[1] || metrics[0];
          
          return {
            labels,
            values,
            metricLabel: metricName.charAt(0).toUpperCase() + metricName.slice(1).replace(/_/g, ' '),
            datasets: [{
              label: metricName.charAt(0).toUpperCase() + metricName.slice(1).replace(/_/g, ' '),
              data: values,
              backgroundColor: 'hsl(var(--primary))',
              borderRadius: 4
            }]
          };
        } else {
          // Multiple metrics
          const colors = [
            'hsl(var(--primary))',
            'hsl(210, 70%, 60%)',
            'hsl(120, 70%, 60%)',
            'hsl(280, 70%, 60%)',
            'hsl(60, 70%, 60%)'
          ];
          
          const datasets = metrics.map((metric, index) => {
            const metricField = dataFields.find(f => f.id === metric);
            const metricName = metricField?.name?.split('.')[1] || metric.split('.')[1] || metric;
            const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
            
            return {
              label: metricName.charAt(0).toUpperCase() + metricName.slice(1).replace(/_/g, ' '),
              data: values,
              backgroundColor: colors[index % colors.length],
              borderRadius: 4
            };
          });
          
          return {
            labels,
            datasets,
            metricLabel: `${metrics.length} métricas`
          };
        }
      }
    }
    
    if (widget.type === 'filter') {
      const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                        widget.config.dimension ? [widget.config.dimension] : [];
      
      if (dimensions.length === 0) return { options: [] };
      
      const dimension = dimensions[0];
      const dimensionField = dataFields.find(f => f.id === dimension);
      const dimensionName = dimensionField?.name?.split('.')[1] || dimension.split('.')[1] || dimension;
      
      // Generate filter options based on field type
      let options = [];
      if (dimensionName.toLowerCase().includes('country') || dimensionName.toLowerCase().includes('pais')) {
        options = ['Brasil', 'EUA', 'México', 'Argentina', 'Chile'];
      } else if (dimensionName.toLowerCase().includes('region') || dimensionName.toLowerCase().includes('regiao')) {
        options = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'];
      } else if (dimensionName.toLowerCase().includes('category') || dimensionName.toLowerCase().includes('categoria')) {
        options = ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'];
      } else if (dimensionName.toLowerCase().includes('status')) {
        options = ['Ativo', 'Inativo', 'Pendente', 'Concluído'];
      } else {
        options = ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4', 'Opção 5'];
      }
      
      return {
        fieldName: dimensionName.charAt(0).toUpperCase() + dimensionName.slice(1).replace(/_/g, ' '),
        options
      };
    }
    
    return { labels: [], values: [] };
  };

  const updateWidgetConfig = (widgetId: number, configUpdates: Partial<WidgetConfig>) => {
    setWidgets(widgets.map(widget => 
      widget.id === widgetId 
        ? { ...widget, config: { ...widget.config, ...configUpdates } }
        : widget
    ));
  };

  const addWidget = (type: Widget['type']) => {
    const newId = Math.max(...widgets.map(w => w.id), 0) + 1;
    const newWidget: Widget = {
      id: newId,
      type,
      config: {},
      layout: { x: 1, y: 1, w: 4, h: 3 }
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newId);
    setIsAddingWidget(false);
  };

  const removeWidget = (widgetId: number) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  const handleSaveDashboard = async () => {
    if (!permissions?.canCreateCharts) {
      toast.error("Você não tem permissão para salvar dashboards");
      return;
    }

    setIsSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('dashboards')
        .insert({
          account_id: profile.account_id,
          name: dashboardName,
          description: 'Dashboard criado com Looker Builder',
          layout_config: JSON.parse(JSON.stringify({
            widgets,
            dataSource: selectedDataSource
          })),
          created_by: user.id
        });

      if (error) throw error;
      toast.success("Dashboard salvo com sucesso!");
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast.error("Erro ao salvar dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para criar dashboards.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="h-screen flex flex-col bg-background">
          {/* Header */}
          <header className="bg-card border-b border-border px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-lg font-bold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 max-w-md"
              placeholder="Nome do relatório"
            />
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  setSelectedDataSource('Vendas Globais');
                  setSelectedTable('');
                  setDataFields(MOCK_DATA['Vendas Globais'].fields);
                }}
              >
                📊 Dados de Exemplo
              </Button>
              
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsAddingWidget(true)}
              >
                <Plus className="w-4 h-4" />
                Adicionar Widget
              </Button>
              
              <Button 
                size="sm" 
                onClick={handleSaveDashboard}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </header>
          
          {/* Widget Type Selector */}
          {isAddingWidget && (
            <div className="bg-card border-b border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Selecione o tipo de widget:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingWidget(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget('scorecard')}
                  className="gap-2"
                >
                  📊 Scorecard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget('bar')}
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Gráfico de Barras
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget('filter')}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtro
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Data Panel */}
            <div className="w-80 border-r border-border bg-card flex flex-col shrink-0">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-base">Dados</h2>
              </div>
              <LookerDataPanel
                dataSources={dataSources}
                selectedDataSource={selectedDataSource}
                selectedTable={selectedTable}
                tables={tables}
                dataFields={dataFields}
                isLoadingFields={isLoadingFields}
                onDataSourceChange={handleDataSourceChange}
                onTableChange={handleTableChange}
              />
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 bg-muted/20 overflow-auto">
                <LookerCanvasGrid
                  widgets={widgets}
                  selectedWidgetId={selectedWidget}
                  onWidgetSelect={setSelectedWidget}
                  onWidgetUpdate={(id, updates) => {
                    setWidgets(widgets.map(widget => 
                      widget.id === id ? { ...widget, ...updates } : widget
                    ));
                  }}
                  onWidgetRemove={removeWidget}
                  processDataForWidget={processDataForWidget}
                />
              </div>
            </div>

            {/* Right Sidebar - Properties Panel */}
            <div className="w-80 border-l border-border bg-card shrink-0">
              <LookerPropertiesPanel
                selectedWidget={selectedWidget ? widgets.find(w => w.id === selectedWidget) || null : null}
                dataFields={dataFields}
                onWidgetConfigUpdate={updateWidgetConfig}
                onDeselectWidget={() => setSelectedWidget(null)}
              />
            </div>
          </div>
        </div>
      </DndContext>
    </AppLayout>
  );
}