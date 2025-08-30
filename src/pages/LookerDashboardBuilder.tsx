import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useWidgetData } from "@/hooks/useWidgetData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  Table,
  CalendarIcon
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
  type: 'dimension' | 'metric' | 'time_dimension';
  dataType: string;
  table: string;
  configuredType?: 'text' | 'number' | 'date' | 'datetime' | 'boolean';
}

interface DatabaseTable {
  name: string;
  type: string;
  columns: DatabaseColumn[];
}

interface DatabaseColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  position: number;
}

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  database_name?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
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
      { id: 'pais', name: 'País', type: 'dimension' as const, dataType: 'text', table: 'vendas', configuredType: 'text' as const },
      { id: 'categoria', name: 'Categoria', type: 'dimension' as const, dataType: 'text', table: 'vendas', configuredType: 'text' as const },
      { id: 'data', name: 'Data', type: 'time_dimension' as const, dataType: 'date', table: 'vendas', configuredType: 'date' as const },
      { id: 'vendas', name: 'Vendas', type: 'metric' as const, dataType: 'numeric', table: 'vendas', configuredType: 'number' as const },
      { id: 'lucro', name: 'Lucro', type: 'metric' as const, dataType: 'numeric', table: 'vendas', configuredType: 'number' as const },
      { id: 'unidades', name: 'Unidades Vendidas', type: 'metric' as const, dataType: 'numeric', table: 'vendas', configuredType: 'number' as const },
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

function LookerDashboardBuilder() {
  const { user } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { processWidgetData, loading: dataLoading } = useWidgetData();
  
  // Component state
  const [currentView, setCurrentView] = useState<'data-sources' | 'builder'>('data-sources');
  const [dataSources, setDataSources] = useState<DataConnection[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [dashboardName, setDashboardName] = useState("Novo Dashboard");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isUsingMockData, setIsUsingMockData] = useState(true);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Form data for new connections
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('postgresql');
  const [formData, setFormData] = useState({
    name: '',
    connection_type: 'postgresql',
    host: '',
    port: '',
    database_name: '',
    username: '',
    password: '',
    supabase_url: '',
    anon_key: '',
    base_url: ''
  });

  // Show loading while permissions are being fetched
  if (permissionsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
            <p className="text-muted-foreground">Verificando permissões...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show access denied if user doesn't have permissions
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

  // Load data sources on component mount
  useEffect(() => {
    loadDataSources();
  }, []);

  // Load fields when data source changes
  useEffect(() => {
    if (selectedDataSource === 'Vendas Globais') {
      setIsUsingMockData(true);
      setDataFields(MOCK_DATA['Vendas Globais'].fields);
    } else if (selectedDataSource) {
      setIsUsingMockData(false);
      loadTables(selectedDataSource);
    }
  }, [selectedDataSource]);

  // Load fields when table changes
  useEffect(() => {
    if (selectedTable && !isUsingMockData) {
      loadFieldsFromTable(selectedTable);
    }
  }, [selectedTable, isUsingMockData]);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, database_name');
      
      if (error) throw error;
      
      // Add mock data source
      const mockDataSource = {
        id: 'Vendas Globais',
        name: 'Vendas Globais (Demo)',
        connection_type: 'mock',
        database_name: 'demo'
      };
      
      setDataSources([mockDataSource, ...(data || [])]);
      
      // Auto-select mock data source if no real connections exist
      if (!data || data.length === 0) {
        setSelectedDataSource('Vendas Globais');
      }
    } catch (error: any) {
      console.error('Error loading data sources:', error);
      toast.error('Erro ao carregar fontes de dados');
    }
  };

  const loadTables = async (connectionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });

      if (error) throw error;

      if (data?.success) {
        setTables(data.tables || []);
      }
    } catch (error: any) {
      console.error('Error loading tables:', error);
      toast.error('Erro ao carregar tabelas');
    }
  };

  const loadFieldsFromTable = async (tableName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId: selectedDataSource }
      });

      if (error) throw error;

      if (data?.success) {
        const table = data.tables?.find((t: DatabaseTable) => t.name === tableName);
        if (table) {
          const fields: DataField[] = table.columns.map((col: DatabaseColumn) => ({
            id: col.name,
            name: col.name,
            type: inferFieldType(col.dataType),
            dataType: col.dataType,
            table: tableName,
            configuredType: mapDataType(col.dataType)
          }));
          setDataFields(fields);
        }
      }
    } catch (error: any) {
      console.error('Error loading fields:', error);
      toast.error('Erro ao carregar campos');
    }
  };

  const inferFieldType = (dataType: string): 'dimension' | 'metric' | 'time_dimension' => {
    const lowerType = dataType.toLowerCase();
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return 'time_dimension';
    }
    if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('decimal') || lowerType.includes('numeric')) {
      return 'metric';
    }
    return 'dimension';
  };

  const mapDataType = (dataType: string): 'text' | 'number' | 'date' | 'datetime' | 'boolean' => {
    const lowerType = dataType.toLowerCase();
    if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
      return lowerType.includes('time') || lowerType.includes('timestamp') ? 'datetime' : 'date';
    }
    if (lowerType.includes('bool')) return 'boolean';
    if (lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('decimal') || lowerType.includes('numeric')) {
      return 'number';
    }
    return 'text';
  };

  const createDataConnection = async () => {
    if (!formData.name || !formData.connection_type) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('data_connections')
        .insert([{
          name: formData.name,
          connection_type: formData.connection_type,
          host: formData.host || null,
          port: formData.port ? parseInt(formData.port) : null,
          database_name: formData.database_name || null,
          username: formData.username || null,
          encrypted_password: formData.password || null,
          account_id: 'current-account', // This should be populated from user context
          created_by: user?.id || '',
          connection_config: {
            supabase_url: formData.supabase_url,
            anon_key: formData.anon_key,
            base_url: formData.base_url
          }
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Conexão criada com sucesso!');
      setIsCreatingConnection(false);
      setFormData({
        name: '',
        connection_type: 'postgresql',
        host: '',
        port: '',
        database_name: '',
        username: '',
        password: '',
        supabase_url: '',
        anon_key: '',
        base_url: ''
      });
      
      loadDataSources();
    } catch (error: any) {
      console.error('Error creating connection:', error);
      toast.error('Erro ao criar conexão');
    }
  };

  const generateMockData = (widgetType: string) => {
    const mockValues = [10, 25, 15, 30, 20];
    const mockLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'];
    
    switch (widgetType) {
      case 'scorecard':
        return { value: 1250, label: 'Total de Vendas' };
      case 'bar':
      case 'line':
        return { labels: mockLabels, values: mockValues };
      case 'pie':
        return { 
          labels: ['Eletrônicos', 'Móveis', 'Roupas'], 
          values: [45, 30, 25] 
        };
      default:
        return { labels: [], values: [] };
    }
  };

  const processDataForWidget = (widget: Widget) => {
    console.log('🔄 Processing data for widget:', widget);
    
    // Generate mock data for now
    return generateMockData(widget.type);
  };

  const updateWidgetConfig = (widgetId: number, configUpdates: Partial<WidgetConfig>) => {
    console.log('🔧 updateWidgetConfig called:', { widgetId, configUpdates });
    
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, config: { ...widget.config, ...configUpdates } }
          : widget
      )
    );
  };

  const handleFieldClick = (field: DataField) => {
    console.log('🔄 Field clicked:', field);
    // Implementation for field click handling
  };

  const addWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: Date.now(),
      type,
      config: {},
      layout: { x: 0, y: 0, w: 4, h: 3 }
    };
    
    setWidgets([...widgets, newWidget]);
    setIsAddingWidget(false);
  };

  const removeWidget = (widgetId: number) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleWidgetUpdate = (widgetId: number, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w));
  };

  const handleSaveDashboard = async () => {
    setIsSaving(true);
    try {
      // Save dashboard logic here
      toast.success('Dashboard salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Handle drag end logic
  };

  // Helper to check if current view is active
  const isDataSourcesActive = currentView === 'data-sources';
  const isBuilderActive = currentView === 'builder';

  if (currentView === 'data-sources') {
    return (
      <AppLayout>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/30 p-4">
            <div className="space-y-2">
              <Button
                variant={isDataSourcesActive ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setCurrentView('data-sources')}
              >
                <Database className="mr-2 h-4 w-4" />
                Fontes de Dados
              </Button>
              <Button
                variant={isBuilderActive ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setCurrentView('builder')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Dashboard Builder
              </Button>
            </div>
          </div>

          {/* Data Sources Content */}
          <div className="flex-1 p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Fontes de Dados</h1>
                <Dialog open={isCreatingConnection} onOpenChange={setIsCreatingConnection}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Conexão
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Nova Conexão de Dados</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Tipo de Conexão</label>
                        <Select
                          value={connectionType}
                          onValueChange={(value) => {
                            setConnectionType(value);
                            setFormData(prev => ({ ...prev, connection_type: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="postgresql">PostgreSQL</SelectItem>
                            <SelectItem value="supabase">Supabase</SelectItem>
                            <SelectItem value="api">API REST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Nome da Conexão</label>
                        <Input
                          placeholder="Ex: Banco de Vendas"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      {formData.connection_type === 'postgresql' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Host</label>
                              <Input
                                placeholder="localhost"
                                value={formData.host}
                                onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Porta</label>
                              <Input
                                placeholder="5432"
                                value={formData.port}
                                onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Nome do Banco</label>
                            <Input
                              placeholder="vendas_db"
                              value={formData.database_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, database_name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Usuário</label>
                            <Input
                              placeholder="usuario"
                              value={formData.username}
                              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Senha</label>
                            <Input
                              type="password"
                              placeholder="senha"
                              value={formData.password}
                              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            />
                          </div>
                        </>
                      )}

                      {formData.connection_type === 'supabase' && (
                        <>
                          <div>
                            <label className="text-sm font-medium">URL do Supabase</label>
                            <Input
                              placeholder="https://xxx.supabase.co"
                              value={formData.supabase_url}
                              onChange={(e) => setFormData(prev => ({ ...prev, supabase_url: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Chave Anônima</label>
                            <Input
                              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                              value={formData.anon_key}
                              onChange={(e) => setFormData(prev => ({ ...prev, anon_key: e.target.value }))}
                            />
                          </div>
                        </>
                      )}

                      {formData.connection_type === 'api' && (
                        <div>
                          <label className="text-sm font-medium">URL Base da API</label>
                          <Input
                            placeholder="https://api.exemplo.com"
                            value={formData.base_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatingConnection(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={createDataConnection}>
                        Criar Conexão
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Connections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources.map((conn) => (
                <Card key={conn.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{conn.name}</CardTitle>
                      <Badge variant="secondary">
                        {conn.connection_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {conn.name}
                    </p>
                    <Button 
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedDataSource(conn.id);
                        setCurrentView('builder');
                      }}
                    >
                      Usar Conexão
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Builder view
  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4">
          <div className="space-y-2">
            <Button
              variant={isDataSourcesActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('data-sources')}
            >
              <Database className="mr-2 h-4 w-4" />
              Fontes de Dados
            </Button>
            <Button
              variant={isBuilderActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentView('builder')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Dashboard Builder
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-xl font-bold bg-transparent border-none focus:border-border max-w-md"
              placeholder="Nome do Dashboard"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingWidget(!isAddingWidget)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Widget
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
          </div>

          {/* Widget Type Selector */}
          {isAddingWidget && (
            <div className="p-4 border-b bg-muted/50">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addWidget('scorecard')}
                  className="flex items-center gap-2"
                >
                  <Hash className="w-4 h-4" />
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
                  Gráfico de Linhas
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

          <div className="flex-1 flex overflow-hidden">
            {/* Data Panel */}
            <LookerDataPanel
              dataSources={dataSources.map(ds => ({ id: ds.id, name: ds.name, type: ds.connection_type }))}
              selectedDataSource={selectedDataSource}
              onDataSourceChange={setSelectedDataSource}
              dataFields={dataFields}
              onFieldClick={handleFieldClick}
              tables={tables}
              selectedTable={selectedTable}
              onTableChange={setSelectedTable}
              isLoadingFields={false}
              selectedWidget={null}
            />

            {/* Canvas */}
            <div className="flex-1 relative overflow-auto">
              <DndContext onDragEnd={handleDragEnd}>
                <LookerCanvasGrid
                  widgets={widgets}
                  selectedWidgetId={selectedWidgetId}
                  onWidgetSelect={setSelectedWidgetId}
                  onWidgetUpdate={handleWidgetUpdate}
                  onWidgetRemove={removeWidget}
                  processDataForWidget={processDataForWidget}
                />
              </DndContext>
            </div>

            {/* Properties Panel */}
            <LookerPropertiesPanel
              selectedWidget={selectedWidgetId ? widgets.find(w => w.id === selectedWidgetId) || null : null}
              dataFields={dataFields}
              onWidgetConfigUpdate={updateWidgetConfig}
              onDeselectWidget={() => setSelectedWidgetId(null)}
            />
          </div>
        </main>
      </div>
    </AppLayout>
  );
}

export default LookerDashboardBuilder;