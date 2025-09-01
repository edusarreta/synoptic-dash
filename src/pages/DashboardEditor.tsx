import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Share, Eye, Settings, BarChart3, PieChart, LineChart, TrendingUp } from 'lucide-react';
import { BackLink } from '@/components/BackLink';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/hooks/use-toast';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout_config?: any;
  created_at: string;
  updated_at: string;
}

interface Widget {
  id: string;
  type: 'chart' | 'kpi' | 'table';
  title: string;
  config: any;
  position: { x: number; y: number; w: number; h: number };
}

export default function DashboardEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && userProfile?.org_id) {
      loadDashboard();
    }
  }, [id, userProfile]);

  const loadDashboard = async () => {
    if (!id || !userProfile?.org_id) return;

    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', id)
        .eq('org_id', userProfile.org_id)
        .single();

      if (error) throw error;

      setDashboard(data);
      
      // Load widgets from layout config or create sample widgets
      const layoutConfig = data.layout_config as any;
      if (layoutConfig?.widgets) {
        setWidgets(layoutConfig.widgets);
      } else {
        // Create sample widgets for demo
        setWidgets([
          {
            id: '1',
            type: 'kpi',
            title: 'Total de Vendas',
            config: { value: 'R$ 125.430', change: '+12%' },
            position: { x: 0, y: 0, w: 3, h: 2 }
          },
          {
            id: '2',
            type: 'chart',
            title: 'Vendas por Mês',
            config: { type: 'bar', data: [] },
            position: { x: 3, y: 0, w: 6, h: 4 }
          },
          {
            id: '3',
            type: 'chart',
            title: 'Distribuição por Categoria',
            config: { type: 'pie', data: [] },
            position: { x: 9, y: 0, w: 3, h: 4 }
          }
        ]);
      }
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

  const saveDashboard = async () => {
    if (!dashboard || !userProfile?.org_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dashboards')
        .update({
          layout_config: {
            ...dashboard.layout_config,
            widgets,
            updated_at: new Date().toISOString()
          }
        })
        .eq('id', dashboard.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dashboard salvo com sucesso",
      });
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar dashboard",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addWidget = (type: 'chart' | 'kpi' | 'table') => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type,
      title: `Novo ${type === 'kpi' ? 'KPI' : type === 'chart' ? 'Gráfico' : 'Tabela'}`,
      config: type === 'kpi' ? { value: '0', change: '+0%' } : { type: 'bar', data: [] },
      position: { x: 0, y: 0, w: type === 'kpi' ? 3 : 6, h: type === 'kpi' ? 2 : 4 }
    };

    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto py-6">
        <BackLink />
        <div className="flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-semibold mb-2">Dashboard não encontrado</h3>
          <p className="text-muted-foreground mb-4">
            O dashboard solicitado não foi encontrado ou você não tem acesso a ele.
          </p>
          <Button onClick={() => navigate('/dashboards')}>
            Voltar para Dashboards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackLink />
          <div>
            <h1 className="text-3xl font-bold">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="text-muted-foreground mt-2">{dashboard.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {widgets.length} widgets
          </Badge>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button onClick={saveDashboard} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Widgets</CardTitle>
          <CardDescription>
            Clique para adicionar novos elementos ao seu dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => addWidget('kpi')}>
              <TrendingUp className="w-4 h-4 mr-2" />
              KPI
            </Button>
            <Button variant="outline" onClick={() => addWidget('chart')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráfico de Barras
            </Button>
            <Button variant="outline" onClick={() => addWidget('chart')}>
              <LineChart className="w-4 h-4 mr-2" />
              Gráfico de Linha
            </Button>
            <Button variant="outline" onClick={() => addWidget('chart')}>
              <PieChart className="w-4 h-4 mr-2" />
              Gráfico de Pizza
            </Button>
            <Button variant="outline" onClick={() => addWidget('table')}>
              <Settings className="w-4 h-4 mr-2" />
              Tabela
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="grid grid-cols-12 gap-4 min-h-96">
        {widgets.map((widget) => (
          <Card 
            key={widget.id}
            className={`col-span-${Math.min(widget.position.w, 12)} cursor-move border-2 border-dashed hover:border-primary transition-colors`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{widget.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWidget(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {widget.type === 'kpi' ? (
                <div className="text-center">
                  <div className="text-2xl font-bold">{widget.config.value}</div>
                  <div className="text-sm text-green-600">{widget.config.change}</div>
                </div>
              ) : widget.type === 'chart' ? (
                <div className="h-32 bg-muted rounded flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Gráfico</span>
                </div>
              ) : (
                <div className="h-32 bg-muted rounded flex items-center justify-center">
                  <Settings className="w-8 h-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Tabela</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {widgets.length === 0 && (
          <div className="col-span-12 flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <Plus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Seu dashboard está vazio</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione widgets usando a barra de ferramentas acima
            </p>
          </div>
        )}
      </div>
    </div>
  );
}