import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Share2, ArrowLeft, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/hooks/use-toast';
import { BackLink } from '@/components/BackLink';
import { WidgetRenderer } from '@/modules/dashboards/editor/components/WidgetRenderer';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { Badge } from '@/components/ui/badge';
import type { Widget as EditorWidget, ChartType } from '@/modules/dashboards/editor/state/editorStore';

interface Widget {
  id: string;
  title: string;
  type: ChartType;
  x: number;
  y: number;
  w: number;
  h: number;
  query: any;
  data?: any;
  loading?: boolean;
  error?: string;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout_config: any;
  widgets: Widget[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
  selectedDatasetId?: string;
}

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalFilters, setGlobalFilters] = useState({});

  useEffect(() => {
    if (id && userProfile?.org_id) {
      loadDashboard();
    }
  }, [id, userProfile]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', id)
        .eq('org_id', userProfile?.org_id)
        .single();

      if (error) throw error;

      // Parse layout_config to extract widgets
      const layoutConfig = data.layout_config as any || {};
      const widgets = Array.isArray(layoutConfig.widgets) ? layoutConfig.widgets : [];

      setDashboard({
        ...data,
        widgets: widgets.map((widget: any) => ({
          ...widget,
          loading: false,
          error: null,
          data: null
        }))
      });
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

  const handleWidgetDataUpdate = (widgetId: string, updates: Partial<Widget>) => {
    setDashboard(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        widgets: prev.widgets.map(widget => 
          widget.id === widgetId 
            ? { ...widget, ...updates }
            : widget
        )
      };
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateLayoutItems = () => {
    if (!dashboard?.widgets) return [];
    
    return dashboard.widgets.map(widget => ({
      i: widget.id,
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 4,
      h: widget.h || 3,
      static: true // View mode - no dragging
    }));
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
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Dashboard não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O dashboard solicitado não existe ou você não tem acesso a ele.
          </p>
          <Button onClick={() => navigate('/dashboards')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Dashboards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackLink to="/dashboards" />
              <div>
                <h1 className="text-2xl font-bold">{dashboard.name}</h1>
                {dashboard.description && (
                  <p className="text-muted-foreground">{dashboard.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Atualizado em {formatDate(dashboard.updated_at)}
                </div>
                {dashboard.widgets.length > 0 && (
                  <Badge variant="outline">
                    {dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {dashboard.is_public && (
                  <Badge variant="secondary">
                    <Share2 className="w-3 h-3 mr-1" />
                    Público
                  </Badge>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboards/${dashboard.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        {dashboard.widgets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Dashboard vazio</h3>
              <p className="text-muted-foreground mb-6">
                Este dashboard ainda não possui widgets. Adicione widgets no modo de edição.
              </p>
              <Button onClick={() => navigate(`/dashboards/${dashboard.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="min-h-[600px]">
            <ResponsiveGridLayout
              layouts={{ lg: generateLayoutItems() }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              isDraggable={false}
              isResizable={false}
              margin={[16, 16]}
              containerPadding={[0, 0]}
            >
              {dashboard.widgets.map((widget) => (
                <div key={widget.id} className="widget-container">
                  <WidgetRenderer
                    widget={widget as any}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        )}
      </div>
    </div>
  );
}