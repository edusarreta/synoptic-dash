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
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  
  // Widgets State
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    // Initialize with mock data first if no connections
    if (connections.length === 0 && !selectedDataSource) {
      console.log('🔧 Initializing with mock data...');
      setSelectedDataSource('Vendas Globais');
      setDataFields(MOCK_DATA['Vendas Globais'].fields);
    }
    // Auto-select first real connection if available
    else if (connections.length > 0 && !selectedDataSource) {
      console.log('🔧 Auto-selecting first connection:', connections[0]);
      const firstConnection = connections[0];
      setSelectedDataSource(firstConnection.id);
      loadTables(firstConnection.id);
    }
  }, [connections]);

  const loadTables = async (connectionId: string) => {
    if (!connectionId || connectionId === 'Vendas Globais') return;
    
    setIsLoadingFields(true);
    setTables([]);
    setSelectedTable('');
    setDataFields([]);
    
    try {
      console.log('📤 Loading tables for connection:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });
      
      console.log('📥 Tables response:', data);
      
      if (error) {
        console.error('❌ Tables error:', error);
        throw error;
      }
      
      if (data?.success && data?.tables && Array.isArray(data.tables)) {
        console.log('✅ Tables loaded:', data.tables.length);
        setTables(data.tables);
      } else {
        console.error('❌ Invalid tables response:', data);
        throw new Error(data?.error || 'Failed to fetch database tables');
      }
    } catch (error: any) {
      console.error('💥 Error loading tables:', error);
      toast.error(`Erro ao carregar tabelas: ${error.message}`);
      setTables([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const loadTableFields = async (tableName: string) => {
    if (!tableName || !selectedDataSource) return;
    
    setIsLoadingFields(true);
    setDataFields([]);
    
    try {
      console.log('📤 Loading fields for table:', tableName);
      
      // Find the selected table from the tables array
      const table = tables.find(t => t.name === tableName);
      if (!table || !table.columns) {
        throw new Error('Tabela não encontrada ou sem colunas');
      }
      
      const fields: DataField[] = table.columns.map((column: any) => {
        const isNumeric = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double', 'money', 'float4', 'float8', 'int', 'smallint'].includes(column.dataType?.toLowerCase() || column.type?.toLowerCase() || '');
        
        return {
          id: `${table.name}.${column.name}`,
          name: `${table.name}.${column.name}`,
          type: isNumeric ? 'metric' : 'dimension',
          dataType: column.dataType || column.type || 'unknown',
          table: table.name
        };
      });
      
      console.log('✅ Table fields loaded:', {
        table: tableName,
        totalFields: fields.length,
        dimensions: fields.filter(f => f.type === 'dimension').length,
        metrics: fields.filter(f => f.type === 'metric').length
      });
      
      setDataFields(fields);
    } catch (error: any) {
      console.error('💥 Error loading table fields:', error);
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
    loadTableFields(tableName);
  };

  const processDataForWidget = (widget: Widget) => {
    console.log('🔄 Processing data for widget:', widget.type, widget.config);
    
    if (widget.type === 'scorecard') {
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                      widget.config.metric ? [widget.config.metric] : [];
      
      if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
      
      if (selectedDataSource === 'Vendas Globais') {
        const source = MOCK_DATA[selectedDataSource];
        const metric = metrics[0];
        const total = source.records.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0);
        const field = source.fields.find(f => f.id === metric);
        return { label: field?.name || 'Métrica', value: total };
      } else {
        // Generate mock data for real database connections
        const mockValue = Math.floor(Math.random() * 10000);
        const metricName = metrics[0].split('.')[1] || metrics[0];
        return {
          value: mockValue,
          label: metricName.charAt(0).toUpperCase() + metricName.slice(1)
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
      
      if (selectedDataSource === 'Vendas Globais') {
        const source = MOCK_DATA[selectedDataSource];
        const dimension = dimensions[0];
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
        // Generate mock data for real database connections
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        
        if (metrics.length === 1) {
          const values = labels.map(() => Math.floor(Math.random() * 1000));
          const metricName = metrics[0].split('.')[1] || metrics[0];
          
          return {
            labels,
            values,
            metricLabel: metricName.charAt(0).toUpperCase() + metricName.slice(1),
            datasets: [{
              label: metricName.charAt(0).toUpperCase() + metricName.slice(1),
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
            const metricName = metric.split('.')[1] || metric;
            const values = labels.map(() => Math.floor(Math.random() * 1000));
            
            return {
              label: metricName.charAt(0).toUpperCase() + metricName.slice(1),
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
    setSelectedWidgetId(newId);
  };

  const removeWidget = (widgetId: number) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
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
      <DndContext onDragEnd={() => {}}>
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
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => addWidget('bar')}
              >
                <Plus className="w-4 h-4" />
                Adicionar Gráfico
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => addWidget('filter')}
              >
                <Filter className="w-4 h-4" />
                Adicionar Controle
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="w-4 h-4" />
                Ver
              </Button>
              
              <Button
                onClick={handleSaveDashboard}
                disabled={isSaving}
                size="sm"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex flex-1 overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 bg-slate-200 overflow-auto">
              <LookerCanvasGrid
                widgets={widgets}
                selectedWidgetId={selectedWidgetId}
                onWidgetSelect={setSelectedWidgetId}
                onWidgetUpdate={(id, updates) => {
                  setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
                }}
                onWidgetRemove={removeWidget}
                processDataForWidget={processDataForWidget}
              />
            </div>

            {/* Side Panel Container */}
            <div className="flex w-[600px] shrink-0 bg-card border-l border-border shadow-lg">
              {/* Data Panel */}
              <div className="w-1/2 border-r border-border">
                <LookerDataPanel
                  connections={[
                    { id: 'Vendas Globais', name: 'Vendas Globais (Exemplo)', connection_type: 'demo' },
                    ...connections
                  ]}
                  selectedDataSource={selectedDataSource}
                  selectedTable={selectedTable}
                  tables={tables}
                  dataFields={dataFields}
                  isLoadingFields={isLoadingFields}
                  onDataSourceChange={handleDataSourceChange}
                  onTableChange={handleTableChange}
                />
              </div>

              {/* Properties Panel */}
              <div className="w-1/2">
                <LookerPropertiesPanel
                  selectedWidget={widgets.find(w => w.id === selectedWidgetId) || null}
                  dataFields={dataFields}
                  onWidgetConfigUpdate={updateWidgetConfig}
                  onDeselectWidget={() => setSelectedWidgetId(null)}
                />
              </div>
            </div>
          </main>
        </div>
      </DndContext>
    </AppLayout>
  );
}