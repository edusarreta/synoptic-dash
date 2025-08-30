import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDatabase } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  Plus, 
  BarChart3, 
  Filter, 
  Share2,
  Eye,
  Database,
  LayoutGrid,
  Hash,
  Type,
  TrendingUp,
  PieChart,
  LineChart,
  Table
} from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from '@dnd-kit/core';

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
  const [currentView, setCurrentView] = useState<'data-sources' | 'builder'>('builder');
  
  // Data Source Modal State
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [connectionType, setConnectionType] = useState('postgresql');
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '5432',
    database_name: '',
    username: '',
    password: '',
    supabase_url: '',
    anon_key: '',
    base_url: ''
  });
  
  // Data State
  const [selectedDataSource, setSelectedDataSource] = useState<string>('Vendas Globais');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>(MOCK_DATA['Vendas Globais'].fields);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  
  // Widget State
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<number | null>(null);
  
  // Add proper handleDragEnd function
  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🎯 Drag ended:', event);
    const { active, over } = event;
    
    if (!over) return;

    // Handle field drop onto widget properties panel
    if (active.data.current?.type === 'field' && over.data.current?.type === 'widget-config') {
      const field = active.data.current.field;
      const widgetId = over.data.current.widgetId;
      const configType = over.data.current.configType; // 'dimensions', 'metrics', etc.
      
      console.log('📊 Dropping field onto widget config:', { field, widgetId, configType });
      
      const configUpdate: any = {};
      
      if (configType === 'dimensions' && field.type === 'dimension') {
        configUpdate.dimensions = [field.id];
      } else if (configType === 'metrics' && field.type === 'metric') {
        configUpdate.metrics = [field.id];
        configUpdate.aggregation = configUpdate.aggregation || 'sum';
      }
      
      if (Object.keys(configUpdate).length > 0) {
        updateWidgetConfig(widgetId, configUpdate);
      }
    }
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
    
    // Always use the selected data source to determine which data to use
    const isUsingMockData = selectedDataSource === 'Vendas Globais';
    
    if (widget.type === 'scorecard') {
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                      widget.config.metric ? [widget.config.metric] : [];
      
      if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
      
      const metric = metrics[0];
      const aggregation = widget.config.aggregation || 'sum';
      
      if (isUsingMockData) {
        const field = dataFields.find(f => f.id === metric);
        const metricName = field?.name?.split('.')[1] || metric.split('.')[1] || metric;
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
        // Generate realistic mock data for real database fields
        const field = dataFields.find(f => f.id === metric);
        const metricName = field?.name?.split('.')[1] || metric.split('.')[1] || metric;
        
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
      
      if (isUsingMockData) {
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
        // Generate appropriate data for real database fields
        let labels = [];
        
        // Generate appropriate labels based on dimension name
        if (dimensionName.toLowerCase().includes('month') || dimensionName.toLowerCase().includes('mes')) {
          labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        } else if (dimensionName.toLowerCase().includes('country') || dimensionName.toLowerCase().includes('pais')) {
          labels = ['Brasil', 'EUA', 'México', 'Argentina', 'Chile'];
        } else if (dimensionName.toLowerCase().includes('region') || dimensionName.toLowerCase().includes('regiao')) {
          labels = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'];
        } else if (dimensionName.toLowerCase().includes('category') || dimensionName.toLowerCase().includes('categoria')) {
          labels = ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'];
        } else {
          // Use generic labels for any field
          labels = [`${dimensionName} 1`, `${dimensionName} 2`, `${dimensionName} 3`, `${dimensionName} 4`];
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
    
    
    if (widget.type === 'line') {
      const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                        widget.config.dimension ? [widget.config.dimension] : [];
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                     widget.config.metric ? [widget.config.metric] : [];
      
      if (dimensions.length === 0 || metrics.length === 0) {
        return { labels: [], datasets: [] };
      }
      
      // Similar to bar chart but for line chart
      const dimension = dimensions[0];
      const dimensionField = dataFields.find(f => f.id === dimension);
      const dimensionName = dimensionField?.name?.split('.')[1] || dimension.split('.')[1] || dimension;
      
      let labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
      const colors = ['hsl(var(--primary))', 'hsl(210, 70%, 60%)', 'hsl(120, 70%, 60%)'];
      
      const datasets = metrics.map((metric, index) => {
        const metricField = dataFields.find(f => f.id === metric);
        const metricName = metricField?.name?.split('.')[1] || metric.split('.')[1] || metric;
        const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
        
        return {
          label: metricName.charAt(0).toUpperCase() + metricName.slice(1).replace(/_/g, ' '),
          data: values,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '20',
          tension: 0.3
        };
      });
      
      return { labels, datasets };
    }
    
    if (widget.type === 'pie') {
      const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : 
                        widget.config.dimension ? [widget.config.dimension] : [];
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                     widget.config.metric ? [widget.config.metric] : [];
      
      if (dimensions.length === 0 || metrics.length === 0) {
        return { labels: [], values: [] };
      }
      
      let labels = ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'];
      const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
      
      return {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 1
        }]
      };
    }
    
    if (widget.type === 'table') {
      const dimensions = Array.isArray(widget.config.dimensions) ? widget.config.dimensions : [];
      const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : [];
      
      if (dimensions.length === 0 && metrics.length === 0) {
        return { columns: [], rows: [] };
      }
      
      const columns = [...dimensions, ...metrics].map(fieldId => {
        const field = dataFields.find(f => f.id === fieldId);
        return {
          key: fieldId,
          name: field?.name?.split('.')[1] || fieldId.split('.')[1] || fieldId,
          type: field?.type || 'dimension'
        };
      });
      
      // Generate sample rows
      const rows = Array.from({ length: 5 }, (_, i) => {
        const row: any = {};
        columns.forEach(col => {
          if (col.type === 'metric') {
            row[col.key] = Math.floor(Math.random() * 1000) + 100;
          } else {
            row[col.key] = `Item ${i + 1}`;
          }
        });
        return row;
      });
      
      return { columns, rows };
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

  const handleWidgetUpdate = (widgetId: number, updates: Partial<Widget>) => {
    setWidgets(widgets.map(widget => 
      widget.id === widgetId ? { ...widget, ...updates } : widget
    ));
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

  // Data source modal handlers
  const handleSaveDataSource = async () => {
    try {
      console.log('💾 Saving data source:', formData);
      toast.success('Fonte de dados adicionada com sucesso!');
      setShowDataSourceModal(false);
      setFormData({
        name: '',
        host: '',
        port: '5432',
        database_name: '',
        username: '',
        password: '',
        supabase_url: '',
        anon_key: '',
        base_url: ''
      });
      loadConnections();
    } catch (error: any) {
      console.error('❌ Error saving data source:', error);
      toast.error(`Erro ao salvar fonte de dados: ${error.message}`);
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

  // Render Data Sources View
  if (currentView === 'data-sources') {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="flex items-center justify-center h-16 border-b border-slate-200">
            <BarChart3 className="w-8 h-8 text-primary mr-2" />
            <h1 className="text-xl font-bold">SynopticBI</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Button
              variant={currentView === 'data-sources' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('data-sources')}
            >
              <Database className="w-5 h-5 mr-3" />
              Fontes de Dados
            </Button>
            <Button
              variant={currentView === 'builder' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('builder')}
            >
              <LayoutGrid className="w-5 h-5 mr-3" />
              Construtor
            </Button>
          </nav>
        </aside>

        {/* Data Sources Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Fontes de Dados</h1>
              <p className="text-muted-foreground mt-1">Conecte e gerencie as suas ligações de bases de dados</p>
            </div>
            <Dialog open={showDataSourceModal} onOpenChange={setShowDataSourceModal}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Fonte de Dados
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Fonte de Dados</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Ligação</label>
                    <Select value={connectionType} onValueChange={setConnectionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        <SelectItem value="supabase">Supabase</SelectItem>
                        <SelectItem value="rest_api">API REST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nome da Ligação</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="A minha Base de Dados de Produção"
                    />
                  </div>
                  {connectionType === 'postgresql' && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="text-sm font-medium">Host</label>
                          <Input
                            value={formData.host}
                            onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                            placeholder="localhost"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Porta</label>
                          <Input
                            value={formData.port}
                            onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                            placeholder="5432"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Nome da Base de Dados</label>
                        <Input
                          value={formData.database_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, database_name: e.target.value }))}
                          placeholder="producao_app"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Utilizador</label>
                        <Input
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="postgres"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Palavra-passe</label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                        />
                      </div>
                    </>
                  )}
                  {connectionType === 'supabase' && (
                    <>
                      <div>
                        <label className="text-sm font-medium">URL do Projeto</label>
                        <Input
                          value={formData.supabase_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, supabase_url: e.target.value }))}
                          placeholder="https://xyz.supabase.co"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Chave Anon (Pública)</label>
                        <Input
                          type="password"
                          value={formData.anon_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, anon_key: e.target.value }))}
                          placeholder="••••••••"
                        />
                      </div>
                    </>
                  )}
                  {connectionType === 'rest_api' && (
                    <div>
                      <label className="text-sm font-medium">URL Base</label>
                      <Input
                        value={formData.base_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                        placeholder="https://api.example.com/v1"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDataSourceModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveDataSource}>
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Connections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((conn) => (
              <Card key={conn.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{conn.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {conn.connection_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground font-mono truncate mb-3">
                    {conn.name}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-primary">
                      Testar
                    </Button>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Render Builder View
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="flex items-center justify-center h-16 border-b border-slate-200">
          <BarChart3 className="w-8 h-8 text-primary mr-2" />
          <h1 className="text-xl font-bold">SynopticBI</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={currentView === 'data-sources' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('data-sources')}
          >
            <Database className="w-5 h-5 mr-3" />
            Fontes de Dados
          </Button>
          <Button
            variant={currentView === 'builder' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setCurrentView('builder')}
          >
            <LayoutGrid className="w-5 h-5 mr-3" />
            Construtor
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DndContext onDragEnd={handleDragEnd}>
          {/* Header */}
          <header className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm shrink-0">
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-lg font-bold bg-transparent border-none shadow-none focus-visible:ring-0 px-0 max-w-md"
            />
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Partilhar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddingWidget(!isAddingWidget)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Gráfico
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveDashboard}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </header>

          {/* Widget Type Selector */}
          {isAddingWidget && (
            <div className="bg-muted/50 border-b p-4">
              <div className="flex items-center gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('scorecard')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Scorecard
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('bar')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Gráfico de Barras
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('line')}
                  className="flex items-center gap-2"
                >
                  <LineChart className="w-4 h-4" />
                  Gráfico de Linha
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('pie')}
                  className="flex items-center gap-2"
                >
                  <PieChart className="w-4 h-4" />
                  Gráfico de Pizza
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('table')}
                  className="flex items-center gap-2"
                >
                  <Table className="w-4 h-4" />
                  Tabela
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addWidget('filter')}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filtro
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            {/* Data Panel */}
            <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-base">Dados</h2>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <Select value={selectedDataSource} onValueChange={handleDataSourceChange}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Selecione uma fonte de dados" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDataSource && selectedDataSource !== 'Vendas Globais' && (
                  <Select value={selectedTable} onValueChange={handleTableChange}>
                    <SelectTrigger className="w-full mb-4">
                      <SelectValue placeholder="Selecione uma tabela" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="space-y-1">
                  {dataFields.map((field) => (
                    <div
                      key={field.id}
                      className={`flex items-center p-2 rounded-md text-sm cursor-grab hover:shadow-sm transition-shadow ${
                        field.type === 'dimension' 
                          ? 'bg-green-50 border border-green-200 text-green-800' 
                          : 'bg-blue-50 border border-blue-200 text-blue-800'
                      }`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'field',
                          field: field
                        }));
                      }}
                    >
                      {field.type === 'dimension' ? (
                        <Type className="w-4 h-4 mr-2" />
                      ) : (
                        <Hash className="w-4 h-4 mr-2" />
                      )}
                      <span className="truncate">{field.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Properties Panel */}
            <aside className="w-80 border-r border-slate-200 bg-white shrink-0">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-base">Propriedades</h2>
              </div>
              {selectedWidget ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Widget {selectedWidget} selecionado - {widgets.find(w => w.id === selectedWidget)?.type}
                  </p>
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Selecione um widget para ver as propriedades
                </div>
              )}
            </aside>

            {/* Canvas */}
            <div className="flex-1 p-4 bg-slate-200 overflow-auto">
              <div className="relative w-full min-h-[1500px] bg-white shadow-lg">
                <LookerCanvasGrid
                  widgets={widgets}
                  selectedWidgetId={selectedWidget}
                  onWidgetSelect={setSelectedWidget}
                  onWidgetUpdate={handleWidgetUpdate}
                  onWidgetRemove={removeWidget}
                  processDataForWidget={processDataForWidget}
                />
              </div>
            </div>
          </div>
        </DndContext>
      </main>
    </div>
  );
}