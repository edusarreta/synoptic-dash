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
  Image, 
  Type, 
  Minus, 
  Square, 
  Palette,
  Settings,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

// Import new components
import { LookerCanvas } from "@/components/looker/LookerCanvas";
import { DataFieldsPanel } from "@/components/looker/DataFieldsPanel";
import { PropertiesPanel } from "@/components/looker/PropertiesPanel";
import { ChartTypePicker } from "@/components/looker/ChartTypePicker";
import { ControlTypePicker } from "@/components/looker/ControlTypePicker";

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

export default function LookerDashboardBuilder() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const { connections, loadConnections } = useDatabase();
  
  // Dashboard State
  const [dashboardName, setDashboardName] = useState("Dashboard sem título");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Canvas State
  const [elements, setElements] = useState<ChartElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isAddingElement, setIsAddingElement] = useState(false);
  const [elementTypeToAdd, setElementTypeToAdd] = useState<string | null>(null);
  
  // Data State
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  
  // UI State
  const [showChartPicker, setShowChartPicker] = useState(false);
  const [showControlPicker, setShowControlPicker] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadDataFields = async (connectionId: string) => {
    setIsLoadingFields(true);
    try {
      const { data } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });
      
      if (data?.tables) {
        const fields: DataField[] = [];
        Object.entries(data.tables).forEach(([tableName, tableData]: [string, any]) => {
          tableData.columns.forEach((column: any) => {
            const isNumeric = ['integer', 'bigint', 'decimal', 'numeric', 'real', 'double', 'money'].includes(column.type.toLowerCase());
            fields.push({
              name: `${tableName}.${column.name}`,
              type: isNumeric ? 'metric' : 'dimension',
              dataType: column.type,
              table: tableName
            });
          });
        });
        setDataFields(fields);
      }
    } catch (error) {
      console.error('Error loading data fields:', error);
      toast.error("Erro ao carregar campos de dados");
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleDataSourceChange = (connectionId: string) => {
    setSelectedDataSource(connectionId);
    loadDataFields(connectionId);
  };

  const handleAddChart = () => {
    setShowChartPicker(true);
    setElementTypeToAdd('chart');
  };

  const handleAddControl = () => {
    setShowControlPicker(true);
    setElementTypeToAdd('control');
  };

  const handleChartTypeSelect = (chartType: string) => {
    setShowChartPicker(false);
    setIsAddingElement(true);
  };

  const handleControlTypeSelect = (controlType: string) => {
    setShowControlPicker(false);
    setIsAddingElement(true);
  };

  const handleCanvasClick = (x: number, y: number) => {
    if (!isAddingElement || !elementTypeToAdd) return;
    
    const newElement: ChartElement = {
      id: `element-${Date.now()}`,
      type: elementTypeToAdd as any,
      position: { x, y },
      size: { width: 400, height: 300 },
      config: {},
      style: {}
    };
    
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
    setIsAddingElement(false);
    setElementTypeToAdd(null);
  };

  const handleElementSelect = (elementId: string) => {
    setSelectedElement(elementId);
  };

  const handleElementUpdate = (elementId: string, updates: Partial<ChartElement>) => {
    setElements(elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));
  };

  const handleElementDelete = (elementId: string) => {
    setElements(elements.filter(el => el.id !== elementId));
    if (selectedElement === elementId) {
      setSelectedElement(null);
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
            elements,
            dataSource: selectedDataSource,
            pages: totalPages
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
      <div className="h-screen flex flex-col bg-background">
        {/* Top Toolbar */}
        <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="text-lg font-medium bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
              placeholder="Nome do dashboard"
            />
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Página {currentPage} de {totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTotalPages(totalPages + 1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Chart Button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddChart}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Adicionar gráfico
                <ChevronDown className="w-3 h-3" />
              </Button>
              
              {showChartPicker && (
                <ChartTypePicker
                  onSelect={handleChartTypeSelect}
                  onClose={() => setShowChartPicker(false)}
                />
              )}
            </div>

            {/* Add Control Button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddControl}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Adicionar controle
                <ChevronDown className="w-3 h-3" />
              </Button>
              
              {showControlPicker && (
                <ControlTypePicker
                  onSelect={handleControlTypeSelect}
                  onClose={() => setShowControlPicker(false)}
                />
              )}
            </div>

            {/* Visual Elements */}
            <Button variant="outline" size="sm" className="gap-2">
              <Image className="w-4 h-4" />
              Imagem
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Type className="w-4 h-4" />
              Texto
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Minus className="w-4 h-4" />
              Linha
            </Button>
            
            <Button variant="outline" size="sm" className="gap-2">
              <Square className="w-4 h-4" />
              Forma
            </Button>

            <div className="h-6 w-px bg-border" />

            {/* Theme and Settings */}
            <Button variant="outline" size="sm" className="gap-2">
              <Palette className="w-4 h-4" />
              Tema
            </Button>

            <div className="h-6 w-px bg-border" />

            {/* Preview and Save */}
            <Button variant="outline" size="sm" className="gap-2">
              <Play className="w-4 h-4" />
              Visualizar
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
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Canvas Area (Center) */}
          <div className="flex-1 bg-gray-50">
            <LookerCanvas
              elements={elements}
              selectedElement={selectedElement}
              isAddingElement={isAddingElement}
              onElementSelect={handleElementSelect}
              onCanvasClick={handleCanvasClick}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
            />
          </div>

          {/* Data Fields Panel (Right) */}
          <div className="w-64 border-l border-border bg-card">
            <DataFieldsPanel
              connections={connections}
              selectedDataSource={selectedDataSource}
              dataFields={dataFields}
              isLoadingFields={isLoadingFields}
              onDataSourceChange={handleDataSourceChange}
            />
          </div>

          {/* Properties Panel (Far Right) */}
          {selectedElement && (
            <div className="w-80 border-l border-border bg-card">
              <PropertiesPanel
                element={elements.find(el => el.id === selectedElement)!}
                dataFields={dataFields}
                onElementUpdate={(updates) => handleElementUpdate(selectedElement, updates)}
                onClose={() => setSelectedElement(null)}
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}