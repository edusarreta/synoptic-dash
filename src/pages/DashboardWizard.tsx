import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, CheckCircle, LayoutDashboard, Database, FileText, Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Connection {
  id: string;
  name: string;
  connection_type: string;
}

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  sql_query: string;
  connection_id: string;
}

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  saved_query_id: string | null;
}

interface WizardStep {
  title: string;
  description: string;
  component: React.ReactNode;
}

export default function DashboardWizard() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [dashboardName, setDashboardName] = useState("");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [selectedDataSource, setSelectedDataSource] = useState<string>("");
  const [dataSourceType, setDataSourceType] = useState<'connection' | 'query' | 'dataset'>('connection');
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    if (!userProfile?.org_id) return;

    setLoading(true);
    try {
      // Load connections
      const { data: connectionsData } = await supabase
        .from('data_connections')
        .select('id, name, connection_type')
        .eq('account_id', userProfile.org_id)
        .eq('is_active', true);

      // Load saved queries
      const { data: queriesData } = await supabase
        .from('saved_queries')
        .select('id, name, description, sql_query, connection_id')
        .eq('org_id', userProfile.org_id);

      // Load datasets
      const { data: datasetsData } = await supabase
        .from('datasets')
        .select('id, name, description, saved_query_id')
        .eq('org_id', userProfile.org_id);

      setConnections(connectionsData || []);
      setSavedQueries(queriesData || []);
      setDatasets(datasetsData || []);
    } catch (error) {
      console.error('Error loading data sources:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar fontes de dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    if (!userProfile?.org_id || !userProfile?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    if (!dashboardName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o dashboard",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('dashboards')
        .insert({
          name: dashboardName,
          description: dashboardDescription || null,
          org_id: userProfile.org_id,
          created_by: userProfile.id,
          layout_config: {
            datasource_id: selectedDataSource,
            datasource_type: dataSourceType
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Dashboard criado",
        description: `Dashboard "${dashboardName}" criado com sucesso!`,
      });

      // Navigate to dashboard editor
      navigate(`/dashboards/${data.id}/edit`);
    } catch (error: any) {
      console.error('Error creating dashboard:', error);
      toast({
        title: "Erro ao criar dashboard",
        description: error.message || "Falha ao criar dashboard",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 0:
        return dashboardName.trim().length > 0;
      case 1:
        return selectedDataSource.length > 0;
      default:
        return true;
    }
  };

  const steps: WizardStep[] = [
    {
      title: "Informações Básicas",
      description: "Configure o nome e descrição do seu dashboard",
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dashboard-name">Nome do Dashboard *</Label>
            <Input
              id="dashboard-name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Meu Dashboard de Vendas"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dashboard-description">Descrição (opcional)</Label>
            <Textarea
              id="dashboard-description"
              value={dashboardDescription}
              onChange={(e) => setDashboardDescription(e.target.value)}
              placeholder="Dashboard com métricas e análises de vendas..."
              rows={3}
            />
          </div>
        </div>
      )
    },
    {
      title: "Fonte de Dados",
      description: "Selecione a fonte de dados para o dashboard",
      component: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Fonte de Dados</Label>
            <Select value={dataSourceType} onValueChange={(value: any) => setDataSourceType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connection">Conexão Direta</SelectItem>
                <SelectItem value="query">Consulta Salva</SelectItem>
                <SelectItem value="dataset">Dataset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fonte de Dados</Label>
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {dataSourceType === 'connection' && connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        {conn.name}
                        <Badge variant="outline">{conn.connection_type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                  
                  {dataSourceType === 'query' && savedQueries.map((query) => (
                    <SelectItem key={query.id} value={query.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {query.name}
                      </div>
                    </SelectItem>
                  ))}
                  
                  {dataSourceType === 'dataset' && datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        {dataset.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {dataSourceType === 'connection' && connections.length === 0 && (
            <div className="text-center p-4 border rounded border-dashed">
              <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conexão encontrada. 
                <Button variant="link" className="p-0 h-auto ml-1" onClick={() => navigate('/data-hub')}>
                  Criar conexão
                </Button>
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Confirmação",
      description: "Revise as configurações e crie o dashboard",
      component: (
        <div className="space-y-4">
          <div className="space-y-4 p-4 border rounded">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Dashboard</h4>
            </div>
            <div className="grid gap-2 ml-7">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span>{dashboardName}</span>
              </div>
              {dashboardDescription && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="text-right max-w-xs truncate">{dashboardDescription}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Fonte de Dados</h4>
            </div>
            <div className="grid gap-2 ml-7">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="outline">
                  {dataSourceType === 'connection' && 'Conexão Direta'}
                  {dataSourceType === 'query' && 'Consulta Salva'}
                  {dataSourceType === 'dataset' && 'Dataset'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fonte:</span>
                <span>
                  {dataSourceType === 'connection' && connections.find(c => c.id === selectedDataSource)?.name}
                  {dataSourceType === 'query' && savedQueries.find(q => q.id === selectedDataSource)?.name}
                  {dataSourceType === 'dataset' && datasets.find(d => d.id === selectedDataSource)?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!can('dashboards:create')) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <LayoutDashboard className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Você não tem permissão para criar dashboards
          </p>
          <BackLink />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackLink />
          <div>
            <h1 className="text-3xl font-bold">Novo Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Assistente para criação de dashboard
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < currentStep ? 'bg-primary text-primary-foreground' :
                  index === currentStep ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm text-primary-foreground">
                  {currentStep + 1}
                </span>
                {steps[currentStep].title}
              </CardTitle>
              <CardDescription>
                {steps[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps[currentStep].component}
              
              <Separator className="my-6" />
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                
                {currentStep === steps.length - 1 ? (
                  <Button
                    onClick={createDashboard}
                    disabled={!canContinue() || submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Criar Dashboard
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    disabled={!canContinue()}
                  >
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}