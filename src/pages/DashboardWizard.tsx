import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Database, BarChart3, ArrowRight, ChevronRight, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/hooks/use-toast';

interface Dataset {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
}

interface Connection {
  id: string;
  name: string;
  connection_type: string;
  is_active: boolean;
}

export default function DashboardWizard() {
  const navigate = useNavigate();
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [dataSource, setDataSource] = useState<'existing' | 'new'>('existing');
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [newDatasetName, setNewDatasetName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.org_id) {
      loadDatasets();
      loadConnections();
    }
  }, [userProfile]);

  const loadDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('org_id', userProfile?.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar datasets",
        variant: "destructive",
      });
    }
  };

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, is_active')
        .eq('account_id', userProfile?.org_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conexões",
        variant: "destructive",
      });
    }
  };

  const createDatasetFromSQL = async () => {
    if (!sqlQuery.trim() || !selectedConnection || !newDatasetName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return null;
    }

    try {
      // First execute the query to create the dataset
      const { data: queryResult, error: queryError } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile?.org_id,
          connection_id: selectedConnection,
          sql: sqlQuery.trim(),
          params: {},
          row_limit: 5000,
          timeout_ms: 30000,
          mode: 'dataset'
        }
      });

      if (queryError || queryResult.error_code) {
        throw new Error(queryResult.message || 'Erro ao executar consulta');
      }

      // Create dataset record
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          org_id: userProfile?.org_id,
          name: newDatasetName,
          description: `Dataset criado via SQL: ${sqlQuery.substring(0, 100)}...`,
          created_by: userProfile?.id,
          data_schema: {
            columns: queryResult.columns,
            row_count: queryResult.rows?.length || 0,
            created_from_sql: true,
            source_connection: selectedConnection
          }
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      toast({
        title: "Dataset criado",
        description: `Dataset "${newDatasetName}" criado com ${queryResult.rows?.length || 0} linhas`,
      });

      return dataset.id;
    } catch (error: any) {
      console.error('Error creating dataset:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar dataset",
        variant: "destructive",
      });
      return null;
    }
  };

  const createDashboard = async () => {
    if (!dashboardName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o dashboard",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let datasetId = selectedDataset;

      // If creating new dataset from SQL
      if (dataSource === 'new') {
        datasetId = await createDatasetFromSQL();
        if (!datasetId) {
          setLoading(false);
          return;
        }
      }

      // Create dashboard
      const { data: dashboard, error } = await supabase
        .from('dashboards')
        .insert({
          org_id: userProfile?.org_id,
          name: dashboardName,
          description: dashboardDescription || null,
          created_by: userProfile?.id,
          layout_config: {
            primary_dataset: datasetId,
            created_via_wizard: true,
            wizard_completed_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Dashboard criado",
        description: "Dashboard criado com sucesso! Redirecionando para o editor...",
      });

      // Redirect to dashboard editor
      setTimeout(() => {
        navigate(`/dashboards/${dashboard.id}/edit`);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating dashboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = dashboardName.trim().length > 0;
  const canProceedStep2 = dataSource === 'existing' ? selectedDataset : 
    (selectedConnection && sqlQuery.trim() && newDatasetName.trim());

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Criar Novo Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Siga o assistente para criar seu dashboard em 3 passos simples
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Dashboard Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Passo 1: Informações do Dashboard
              </CardTitle>
              <CardDescription>
                Defina o nome e descrição do seu dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-name">Nome do Dashboard *</Label>
                <Input
                  id="dashboard-name"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="Ex: Vendas por Região"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dashboard-description">Descrição (opcional)</Label>
                <Textarea
                  id="dashboard-description"
                  value={dashboardDescription}
                  onChange={(e) => setDashboardDescription(e.target.value)}
                  placeholder="Descreva o propósito deste dashboard..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Data Source */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Passo 2: Fonte de Dados
              </CardTitle>
              <CardDescription>
                Escolha um dataset existente ou crie um novo via SQL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data source selection */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    dataSource === 'existing' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setDataSource('existing')}
                >
                  <CardContent className="p-4 text-center">
                    <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Dataset Existente</h3>
                    <p className="text-sm text-muted-foreground">
                      Use um dataset já criado
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all border-2 ${
                    dataSource === 'new' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setDataSource('new')}
                >
                  <CardContent className="p-4 text-center">
                    <Play className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Criar via SQL</h3>
                    <p className="text-sm text-muted-foreground">
                      Execute uma consulta SQL
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Existing dataset selection */}
              {dataSource === 'existing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecionar Dataset</Label>
                    <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasets.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name}
                            {dataset.description && (
                              <span className="text-muted-foreground ml-2">
                                - {dataset.description}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {datasets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-2" />
                      <p>Nenhum dataset encontrado</p>
                      <p className="text-sm">Crie um dataset via SQL primeiro</p>
                    </div>
                  )}
                </div>
              )}

              {/* New dataset from SQL */}
              {dataSource === 'new' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Conexão</Label>
                    <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha uma conexão" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} - {connection.connection_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Dataset</Label>
                    <Input
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
                      placeholder="Ex: Vendas Mensais"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Consulta SQL</Label>
                    <Textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM vendas WHERE data >= '2024-01-01';"
                      className="font-mono text-sm"
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      Apenas consultas SELECT são permitidas
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Passo 3: Confirmação
              </CardTitle>
              <CardDescription>
                Revise as configurações e crie seu dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Nome do Dashboard</Label>
                  <p className="text-sm text-muted-foreground">{dashboardName}</p>
                </div>
                
                {dashboardDescription && (
                  <div>
                    <Label className="text-sm font-medium">Descrição</Label>
                    <p className="text-sm text-muted-foreground">{dashboardDescription}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Fonte de Dados</Label>
                  <p className="text-sm text-muted-foreground">
                    {dataSource === 'existing' 
                      ? `Dataset: ${datasets.find(d => d.id === selectedDataset)?.name || 'Selecionado'}`
                      : `Novo dataset: "${newDatasetName}" via SQL`
                    }
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button 
                  onClick={createDashboard}
                  disabled={loading}
                  className="bg-primary"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Dashboard
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
