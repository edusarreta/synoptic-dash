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
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  
  // Widgets State
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    // Set initial data source to first available connection or mock data
    if (connections.length > 0 && !selectedDataSource) {
      setSelectedDataSource(connections[0].id);
      loadDataFields(connections[0].id);
    } else if (connections.length === 0 && !selectedDataSource) {
      // Use mock data as fallback
      setSelectedDataSource('Vendas Globais');
      setDataFields(MOCK_DATA['Vendas Globais'].fields);
    }
  }, [connections, selectedDataSource]);

  const loadDataFields = async (connectionId: string) => {
    setIsLoadingFields(true);
    try {
      console.log('📤 Loading data fields for connection:', connectionId);
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });
      
      console.log('📥 Schema response:', data);
      
      if (error) {
        console.error('❌ Schema error:', error);
        throw error;
      }
      
      if (data?.success && data?.tables) {
        const fields: DataField[] = [];
        data.tables.forEach((table: any) => {
          table.columns.forEach((column: any) => {
            const isNumeric = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double', 'money', 'float4', 'float8'].includes(column.type.toLowerCase());
            fields.push({
              id: `${table.name}.${column.name}`,
              name: `${table.name}.${column.name}`,
              type: isNumeric ? 'metric' : 'dimension',
              dataType: column.type,
              table: table.name
            });
          });
        });
        console.log('✅ Fields loaded:', fields.length);
        setDataFields(fields);
      } else {
        console.error('❌ Schema response failed:', data);
        throw new Error(data?.error || 'Failed to fetch database schema');
      }
    } catch (error: any) {
      console.error('💥 Error loading data fields:', error);
      toast.error(`Erro ao carregar campos: ${error.message}`);
      setDataFields([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleDataSourceChange = (connectionId: string) => {
    setSelectedDataSource(connectionId);
    if (connectionId === 'Vendas Globais') {
      setDataFields(MOCK_DATA['Vendas Globais'].fields);
      setIsLoadingFields(false);
    } else if (connectionId) {
      loadDataFields(connectionId);
    } else {
      setDataFields([]);
      setIsLoadingFields(false);
    }
  };

  const processDataForWidget = (widget: Widget) => {
    const source = MOCK_DATA[selectedDataSource];
    if (!source || !widget.config) return {};

    if (widget.type === 'scorecard' && widget.config.metric) {
      const metric = widget.config.metric;
      const total = source.records.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0);
      const field = source.fields.find(f => f.id === metric);
      return { label: field?.name || 'Métrica', value: total };
    }
    
    if (widget.type === 'bar' && widget.config.dimension && widget.config.metric) {
      const dimension = widget.config.dimension;
      const metric = widget.config.metric;
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
    }
    
    return {};
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
                    { id: 'Vendas Globais', name: 'Vendas Globais', connection_type: 'mock' },
                    ...connections
                  ]}
                  selectedDataSource={selectedDataSource}
                  dataFields={dataFields}
                  isLoadingFields={isLoadingFields}
                  onDataSourceChange={handleDataSourceChange}
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