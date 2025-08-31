import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Database, Users, TrendingUp, Sparkles, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { AIInsightsModal } from "@/components/ai/AIInsightsModal";
import { SmartDashboardFilters, SmartFilterState } from "@/components/dashboard/SmartDashboardFilters";
import { AdvancedDashboard } from "@/components/dashboard/AdvancedDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedCharts, setSavedCharts] = useState([]);
  const [filteredCharts, setFilteredCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'advanced' | 'simple'>('advanced');
  const [smartFilters, setSmartFilters] = useState<SmartFilterState>({
    dateRange: { from: undefined, to: undefined, field: '' },
    fieldFilters: {},
    textFilters: {}
  });
  const [stats] = useState([
    {
      title: "Total Dashboards",
      value: "12",
      description: "Active dashboards",
      icon: BarChart3,
      trend: "+2 this month",
    },
    {
      title: "Data Sources",
      value: "4",
      description: "Connected databases",
      icon: Database,
      trend: "+1 this week",
    },
    {
      title: "Team Members",
      value: "8",
      description: "Active users",
      icon: Users,
      trend: "+3 this month",
    },
    {
      title: "Total Queries",
      value: "1,234",
      description: "This month",
      icon: TrendingUp,
      trend: "+15% increase",
    },
  ]);

  useEffect(() => {
    if (user) {
      loadSavedCharts();
    }
  }, [user]);

  // Reload charts when navigating back from chart creation
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('Window focused, reloading charts...');
        loadSavedCharts();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  useEffect(() => {
    applySmartFilters();
  }, [savedCharts, smartFilters]);

  const loadSavedCharts = async () => {
    try {
      setLoading(true);
      
      // Get user's account_id first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Get saved charts with connection info
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
        .eq('account_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Execute queries to get actual data for each chart
      const chartsWithData = await Promise.all(
        (charts || []).map(async (chart) => {
          try {
            console.log(`Executing query for chart: ${chart.name}`);
            console.log(`Query: ${chart.sql_query}`);
            
            const { data } = await supabase.functions.invoke('execute-sql-query', {
              body: {
                connectionId: chart.data_connection_id,
                sqlQuery: chart.sql_query
              }
            });
            
            console.log(`Chart ${chart.name} data:`, data?.data);
            
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

      console.log('Charts with data loaded:', chartsWithData);
      setSavedCharts(chartsWithData);
    } catch (error) {
      console.error('Error loading saved charts:', error);
      toast.error('Erro ao carregar gráficos salvos');
    } finally {
      setLoading(false);
    }
  };

  const applySmartFilters = () => {
    console.log('Applying smart filters:', smartFilters);
    console.log('Original charts:', savedCharts.length);
    
    let filtered = [...savedCharts];
    
    filtered = filtered.map(chart => {
      if (!chart.data || chart.data.length === 0) {
        return { ...chart, filteredData: [] };
      }
      
      let chartData = [...chart.data];
      const originalCount = chartData.length;
      
      // Apply date range filter
      if (smartFilters.dateRange.from && smartFilters.dateRange.to && smartFilters.dateRange.field) {
        chartData = chartData.filter(row => {
          const rowDate = new Date(row[smartFilters.dateRange.field]);
          return rowDate >= smartFilters.dateRange.from! && rowDate <= smartFilters.dateRange.to!;
        });
        console.log(`Date filter applied to ${chart.name}: ${originalCount} -> ${chartData.length}`);
      }
      
      // Apply field filters
      Object.entries(smartFilters.fieldFilters).forEach(([fieldName, filter]) => {
        if (filter.values.length > 0) {
          const beforeCount = chartData.length;
          chartData = chartData.filter(row => {
            return filter.values.includes(String(row[fieldName]));
          });
          console.log(`Field filter ${fieldName} applied to ${chart.name}: ${beforeCount} -> ${chartData.length}`);
        }
      });
      
      // Apply text filters
      Object.entries(smartFilters.textFilters).forEach(([fieldName, filter]) => {
        if (filter.value) {
          const beforeCount = chartData.length;
          chartData = chartData.filter(row => {
            return String(row[fieldName]).toLowerCase().includes(filter.value.toLowerCase());
          });
          console.log(`Text filter ${fieldName} applied to ${chart.name}: ${beforeCount} -> ${chartData.length}`);
        }
      });
      
      return { ...chart, filteredData: chartData };
    });
    
    console.log('Filtered charts:', filtered.length);
    setFilteredCharts(filtered);
  };

  const handleSmartFiltersChange = (newFilters: SmartFilterState) => {
    console.log('Smart filters changed:', newFilters);
    setSmartFilters(newFilters);
  };

  const handleCreateChart = () => {
    console.log('Navigating to create chart...');
    navigate('/charts');
  };

  const handleDeleteChart = async (chartId: string) => {
    try {
      const { error } = await supabase
        .from('saved_charts')
        .delete()
        .eq('id', chartId);

      if (error) {
        throw error;
      }

      setSavedCharts(prev => prev.filter(chart => chart.id !== chartId));
      toast.success('Gráfico removido com sucesso');
    } catch (error) {
      console.error('Error deleting chart:', error);
      toast.error('Erro ao remover gráfico');
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your Business Intelligence workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'advanced' ? 'simple' : 'advanced')}
              className="flex items-center gap-2"
            >
              {viewMode === 'advanced' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {viewMode === 'advanced' ? 'Modo Avançado' : 'Modo Simples'}
            </Button>
            <Button className="gradient-primary" onClick={handleCreateChart}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Gráfico
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden glass-card border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-accent font-medium mt-2">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart Filters Section */}
        <SmartDashboardFilters 
          charts={savedCharts}
          activeFilters={smartFilters}
          onFiltersChange={handleSmartFiltersChange}
          className="mb-6"
        />

        {/* Dashboard Content */}
        {viewMode === 'advanced' ? (
          <AdvancedDashboard 
            charts={filteredCharts}
            onDeleteChart={handleDeleteChart}
            onCreateChart={handleCreateChart}
            smartFilters={smartFilters}
            onFiltersChange={handleSmartFiltersChange}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Meus Gráficos</h2>
                <p className="text-muted-foreground">
                  Visualize e gerencie seus gráficos salvos 
                  {filteredCharts.length !== savedCharts.length && (
                    <span className="ml-1">
                      ({filteredCharts.length} de {savedCharts.length} gráficos)
                    </span>
                  )}
                </p>
              </div>
              <Button onClick={handleCreateChart} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Gráfico
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando gráficos...</p>
              </div>
            ) : filteredCharts.length === 0 && savedCharts.length > 0 ? (
              <Card className="glass-card border-0 shadow-card">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum gráfico encontrado</h3>
                  <p className="text-muted-foreground mb-6">
                    Nenhum gráfico corresponde aos filtros selecionados
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSmartFilters({
                      dateRange: { from: undefined, to: undefined, field: '' },
                      fieldFilters: {},
                      textFilters: {}
                    })}
                  >
                    Limpar Filtros
                  </Button>
                </CardContent>
              </Card>
            ) : savedCharts.length === 0 ? (
              <Card className="glass-card border-0 shadow-card">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum gráfico criado ainda</h3>
                  <p className="text-muted-foreground mb-6">
                    Comece criando seu primeiro gráfico para visualizar seus dados
                  </p>
                  <Button onClick={handleCreateChart} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Gráfico
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCharts.map((chart) => (
                  <Card key={chart.id} className="glass-card border-0 shadow-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold">{chart.name}</CardTitle>
                          {chart.description && (
                            <CardDescription className="text-xs mt-1">
                              {chart.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteChart(chart.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="h-48 border rounded p-2 bg-background/50">
                        {/* Simple chart preview */}
                        <div className="text-center text-muted-foreground text-sm">
                          {chart.chart_type} - {chart.data?.length || 0} registros
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 glass-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Suas ações mais recentes no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Gráfico criado", item: "Vendas por Mês", time: "2 horas atrás" },
                  { action: "Conexão adicionada", item: "Base de Produtos", time: "1 dia atrás" },
                  { action: "Dashboard atualizado", item: "Relatório Financeiro", time: "3 dias atrás" },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-foreground">{activity.action}</h4>
                      <p className="text-sm text-muted-foreground">
                        {activity.item}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card border-0 shadow-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12" onClick={handleCreateChart}>
                <BarChart3 className="w-4 h-4 mr-3" />
                Criar Gráfico
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => navigate('/data-sources')}>
                <Database className="w-4 h-4 mr-3" />
                Adicionar Fonte de Dados
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => navigate('/settings')}>
                <Users className="w-4 h-4 mr-3" />
                Convidar Equipe
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="glass-card border-0 shadow-card bg-gradient-to-r from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-xl">Bem-vindo ao SynopticBI</CardTitle>
            <CardDescription className="text-base">
              Comece a construir dashboards de analytics poderosos em minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Conectar Dados</h3>
                <p className="text-sm text-muted-foreground">
                  Conecte aos seus bancos PostgreSQL e Supabase com segurança
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. Criar Gráficos</h3>
                <p className="text-sm text-muted-foreground">
                  Construa visualizações com consultas SQL
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. Construir Dashboards</h3>
                <p className="text-sm text-muted-foreground">
                  Combine gráficos em dashboards interativos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}