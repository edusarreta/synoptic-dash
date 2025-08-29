import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { DynamicDashboardFilters } from "@/components/dashboard/DynamicDashboardFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";

export default function DashboardNew() {
  const { permissions } = usePermissions();
  const { user } = useAuth();
  const [savedCharts, setSavedCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [layouts, setLayouts] = useState<any[]>([]);

  useEffect(() => {
    loadSavedCharts();
  }, [user]);

  useEffect(() => {
    // Initialize grid layout based on saved charts
    if (savedCharts.length > 0) {
      const initialLayouts = savedCharts.map((chart, index) => ({
        i: chart.id.toString(),
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 6,
        w: 4,
        h: 6,
        minW: 3,
        minH: 4
      }));
      setLayouts(initialLayouts);
    }
  }, [savedCharts]);

  const loadSavedCharts = async () => {
    try {
      setLoading(true);

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
        .order('created_at', { ascending: false });

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
    } finally {
      setLoading(false);
    }
  };

  // Filter charts based on active filters
  const filteredCharts = savedCharts.filter(chart => {
    if (!chart.data || chart.data.length === 0) return true;
    
    return Object.entries(activeFilters).every(([filterKey, filterValue]) => {
      if (!filterValue) return true;
      
      if (filterKey === 'dateRange' && filterValue.from && filterValue.to) {
        // Handle date range filtering
        const dateField = chart.chart_config?.dataConfiguration?.primaryDateField;
        if (!dateField) return true;
        
        return chart.data.some(row => {
          const rowDate = new Date(row[dateField]);
          return rowDate >= filterValue.from && rowDate <= filterValue.to;
        });
      }
      
      if (filterKey.startsWith('field_')) {
        const fieldName = filterKey.replace('field_', '');
        return chart.data.some(row => 
          String(row[fieldName]).toLowerCase().includes(String(filterValue).toLowerCase())
        );
      }
      
      return true;
    });
  });

  const handleLayoutChange = (layout: any[]) => {
    setLayouts(layout);
  };

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view dashboards.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Interativo</h1>
          <p className="text-muted-foreground mt-1">
            Arraste e redimensione seus gráficos para criar o layout perfeito
          </p>
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <DynamicDashboardFilters
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
          />

          {/* Charts Grid with Drag & Drop */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCharts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum Gráfico Encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {savedCharts.length === 0 
                    ? "Você ainda não criou nenhum gráfico. Comece criando seu primeiro gráfico!"
                    : "Nenhum gráfico corresponde aos filtros atuais. Tente ajustar os critérios de filtro."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="w-full min-h-screen">
              <GridLayout
                className="layout"
                layout={layouts}
                onLayoutChange={handleLayoutChange}
                cols={12}
                rowHeight={60}
                width={1200}
                isDraggable={true}
                isResizable={true}
                useCSSTransforms={true}
                compactType="vertical"
                preventCollision={false}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                style={{ minHeight: '100vh' }}
              >
                {filteredCharts.map((chart) => (
                  <div 
                    key={chart.id.toString()}
                    className="chart-container"
                    style={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      position: 'relative'
                    }}
                  >
                    <div className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity z-10">
                      <div className="bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-muted-foreground border">
                        Arraste para mover • Redimensione pelas bordas
                      </div>
                    </div>
                    <ChartRenderer
                      config={{
                        type: chart.chart_type,
                        title: chart.name,
                        description: chart.description,
                        xAxis: chart.chart_config?.xAxis || '',
                        yAxis: chart.chart_config?.yAxis || [],
                        data: chart.data || []
                      }}
                      className="h-full flex-1 transition-shadow hover:shadow-lg"
                    />
                  </div>
                ))}
              </GridLayout>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}