import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, BarChart3, Share2, Trash2, Edit, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/hooks/use-toast';
import { BackLink } from '@/components/BackLink';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function DashboardList() {
  const navigate = useNavigate();
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.org_id) {
      loadDashboards();
    }
  }, [userProfile]);

  const loadDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('org_id', userProfile?.org_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
    } catch (error) {
      console.error('Error loading dashboards:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dashboards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    try {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', dashboardId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dashboard excluído com sucesso",
      });

      loadDashboards();
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir dashboard",
        variant: "destructive",
      });
    }
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando dashboards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <BackLink to="/app" />
          <h1 className="text-2xl font-bold mt-4">Dashboards</h1>
          <p className="text-muted-foreground">
            Gerencie e visualize seus dashboards
          </p>
        </div>
        
        <Button onClick={() => navigate('/dashboards/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dashboard criado</h3>
            <p className="text-muted-foreground mb-6">
              Comece criando seu primeiro dashboard para visualizar seus dados
            </p>
            <Button onClick={() => navigate('/dashboards/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                    {dashboard.description && (
                      <CardDescription className="mt-1">
                        {dashboard.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {dashboard.is_public && (
                      <Badge variant="secondary" className="text-xs">
                        <Share2 className="w-3 h-3 mr-1" />
                        Público
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  Atualizado em {formatDate(dashboard.updated_at)}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboards/${dashboard.id}`)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboards/${dashboard.id}/edit`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o dashboard "{dashboard.name}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDashboard(dashboard.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}