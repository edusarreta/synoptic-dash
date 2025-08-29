import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDatabase } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { Save, Eye, Play, Settings } from "lucide-react";
import { toast } from "sonner";

import { ControlToolbar } from "@/components/dashboard/controls/ControlToolbar";
import { ControlCanvas } from "@/components/dashboard/controls/ControlCanvas";
import { ControlConfiguration, ControlType, FilterCondition, DashboardControlsState } from "@/components/dashboard/controls/ControlTypes";
import { ChartRenderer } from "@/components/charts/ChartRenderer";

export default function DashboardBuilder() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const { connections, loadConnections } = useDatabase();
  
  // Dashboard State
  const [dashboardName, setDashboardName] = useState("Novo Dashboard");
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Controls State
  const [controlsState, setControlsState] = useState<DashboardControlsState>({
    controls: [],
    activeFilters: [],
    selectedControl: null
  });
  
  // Adding Control State
  const [isAddingControl, setIsAddingControl] = useState(false);
  const [controlTypeToAdd, setControlTypeToAdd] = useState<ControlType | null>(null);
  
  // Charts Data
  const [savedCharts, setSavedCharts] = useState<any[]>([]);
  const [filteredChartsData, setFilteredChartsData] = useState<any[]>([]);

  useEffect(() => {
    loadConnections();
    loadSavedCharts();
  }, []);

  // Apply filters to charts when filters change
  useEffect(() => {
    applyFiltersToCharts();
  }, [controlsState.activeFilters, savedCharts]);

  const loadSavedCharts = async () => {
    try {
      // Get user's account_id first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // Fetch saved charts for the account
      const { data: charts, error } = await supabase
        .from('saved_charts')
        .select(`
          *,
          data_connections!inner(
            id,
            name,
            database_name,
            connection_type
          )
        `)
        .eq('account_id', profile.account_id)
        .order('created_at', { ascending: false })
        .limit(6); // Limit for demo

      if (error) {
        console.error('Error fetching charts:', error);
        return;
      }

      // Execute queries to get actual data for each chart
      const chartsWithData = await Promise.all(
        (charts || []).map(async (chart) => {
          try {
            const { data } = await supabase.functions.invoke('execute-sql-query', {
              body: {
                connectionId: chart.data_connection_id,
                query: chart.sql_query
              }
            });
            
            return {
              ...chart,
              data: data?.data || []
            };
          } catch (error) {
            console.error(`Error executing query for chart ${chart.id}:`, error);
            return {
              ...chart,
              data: []
            };
          }
        })
      );

      setSavedCharts(chartsWithData);
    } catch (error) {
      console.error('Error in loadSavedCharts:', error);
    }
  };

  const applyFiltersToCharts = () => {
    const filtered = savedCharts.map(chart => {
      let filteredData = [...(chart.data || [])];
      
      // Apply each active filter
      controlsState.activeFilters.forEach(filter => {
        if (filter.dataSource === chart.data_connection_id) {
          filteredData = filteredData.filter(row => {
            const fieldValue = row[filter.field];
            
            switch (filter.operator) {
              case 'equals':
                return fieldValue === filter.value;
              case 'contains':
                return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
              case 'starts_with':
                return String(fieldValue).toLowerCase().startsWith(String(filter.value).toLowerCase());
              case 'ends_with':
                return String(fieldValue).toLowerCase().endsWith(String(filter.value).toLowerCase());
              case 'in':
                const values = Array.isArray(filter.value) ? filter.value : [filter.value];
                return values.includes(fieldValue);
              case 'between':
                if (filter.value && filter.value.from && filter.value.to) {
                  const date = new Date(fieldValue);
                  const fromDate = new Date(filter.value.from);
                  const toDate = new Date(filter.value.to);
                  return date >= fromDate && date <= toDate;
                }
                return true;
              default:
                return true;
            }
          });
        }
      });
      
      return {
        ...chart,
        filteredData
      };
    });
    
    setFilteredChartsData(filtered);
  };

  const handleAddControl = (type: ControlType) => {
    setControlTypeToAdd(type);
    setIsAddingControl(true);
  };

  const handleFinishAddingControl = () => {
    setIsAddingControl(false);
    setControlTypeToAdd(null);
  };

  const handleControlsChange = (controls: ControlConfiguration[]) => {
    setControlsState(prev => ({
      ...prev,
      controls
    }));
  };

  const handleFiltersChange = (filters: FilterCondition[]) => {
    setControlsState(prev => ({
      ...prev,
      activeFilters: filters
    }));
  };

  const handleSelectControl = (controlId: string | null) => {
    setControlsState(prev => ({
      ...prev,
      selectedControl: controlId
    }));
  };

  const handleSaveDashboard = async () => {
    if (!permissions?.canCreateCharts) {
      toast.error("Você não tem permissão para salvar dashboards");
      return;
    }

    setIsSaving(true);
    try {
      // Get user's account_id first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Save dashboard
      const { data: dashboard, error } = await supabase
        .from('dashboards')
        .insert({
          account_id: profile.account_id,
          name: dashboardName,
          description: 'Dashboard criado com controles interativos',
          layout_config: JSON.parse(JSON.stringify({
            controls: controlsState.controls,
            charts: savedCharts.map(chart => chart.id)
          })),
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success("Dashboard salvo com sucesso!");
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast.error("Erro ao salvar dashboard");
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailableDataSources = () => {
    return connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      type: conn.connection_type
    }));
  };

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Acesso Negado</CardTitle>
              <CardDescription>
                Você não tem permissão para criar dashboards.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
              />
              <span className="text-sm text-gray-500">
                {controlsState.controls.length} controles • {controlsState.activeFilters.length} filtros ativos
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ControlToolbar 
                onAddControl={handleAddControl}
                disabled={isAddingControl}
              />
              
              <div className="h-6 w-px bg-gray-300" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isPreviewMode ? 'Editar' : 'Visualizar'}
              </Button>
              
              <Button
                onClick={handleSaveDashboard}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Dashboard'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 relative">
            <ControlCanvas
              controls={controlsState.controls}
              selectedControl={controlsState.selectedControl}
              activeFilters={controlsState.activeFilters}
              onControlsChange={handleControlsChange}
              onFiltersChange={handleFiltersChange}
              onSelectControl={handleSelectControl}
              isAddingControl={isAddingControl}
              controlTypeToAdd={controlTypeToAdd}
              onFinishAddingControl={handleFinishAddingControl}
              canvasWidth={1200}
              canvasHeight={800}
              availableDataSources={getAvailableDataSources()}
            />
          </div>
        </div>

        {/* Charts Preview */}
        {filteredChartsData.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Gráficos Afetados pelos Filtros ({filteredChartsData.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChartsData.slice(0, 6).map((chart) => (
                <div key={chart.id} className="h-48">
                  <ChartRenderer
                    config={{
                      type: chart.chart_type,
                      title: chart.name,
                      description: `${chart.filteredData?.length || 0} registros`,
                      xAxis: chart.chart_config?.xAxis || '',
                      yAxis: chart.chart_config?.yAxis || [],
                      data: chart.filteredData || []
                    }}
                    className="h-full text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}