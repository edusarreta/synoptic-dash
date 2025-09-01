import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, Save, Database, Download, Loader2, Clock, BarChart } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  is_active: boolean;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  total_rows: number;
  truncated: boolean;
  elapsed_ms: number;
}

interface QueryFormData {
  name: string;
  description: string;
  ttl_seconds: number;
}

export default function SQLEditor() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState('SELECT now() AS current_timestamp;');
  const [queryParams, setQueryParams] = useState<Record<string, any>>({});
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDatasetDialog, setShowDatasetDialog] = useState(false);
  
  const saveForm = useForm<QueryFormData>({
    defaultValues: {
      name: '',
      description: '',
      ttl_seconds: 300
    }
  });

  useEffect(() => {
    loadConnections();
  }, []);

  // Extract parameters from SQL query
  useEffect(() => {
    const paramMatches = sqlQuery.match(/:(\w+)/g);
    if (paramMatches) {
      const newParams: Record<string, any> = {};
      paramMatches.forEach(match => {
        const paramName = match.substring(1);
        if (!queryParams[paramName]) {
          newParams[paramName] = '';
        } else {
          newParams[paramName] = queryParams[paramName];
        }
      });
      setQueryParams(newParams);
    }
  }, [sqlQuery]);

  const loadConnections = async () => {
    if (!userProfile?.org_id) return;

    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, is_active')
        .eq('account_id', userProfile.org_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading connections:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar conexões",
          variant: "destructive",
        });
        return;
      }

      setConnections(data || []);
      if (data && data.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const executeQuery = async () => {
    if (!selectedConnectionId || !sqlQuery.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma conexão e escreva uma consulta SQL",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    setQueryResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile?.org_id,
          connection_id: selectedConnectionId,
          sql: sqlQuery,
          params: queryParams,
          row_limit: 1000,
          timeout_ms: 15000,
          mode: 'preview'
        }
      });

      if (error) {
        throw error;
      }

      if (data.error_code) {
        toast({
          title: "Erro na consulta",
          description: data.message,
          variant: "destructive",
        });
        return;
      }

      setQueryResult(data);
      toast({
        title: "✅ Consulta executada",
        description: `${data.total_rows} linhas em ${data.elapsed_ms}ms`,
      });

    } catch (error) {
      console.error('Query execution error:', error);
      toast({
        title: "Falha ao executar consulta SQL",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const saveQuery = async () => {
    const formData = saveForm.getValues();
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a consulta",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile?.org_id,
          connection_id: selectedConnectionId,
          name: formData.name,
          description: formData.description,
          sql_query: sqlQuery,
          parameters: queryParams,
          created_by: userProfile?.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Consulta salva",
        description: `ID: ${data.id}`,
      });

      setShowSaveDialog(false);
      saveForm.reset();
    } catch (error) {
      console.error('Save query error:', error);
      toast({
        title: "Erro ao salvar consulta",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createDataset = async () => {
    const formData = saveForm.getValues();
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o dataset",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // First, save the query
      const { data: savedQuery, error: queryError } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile?.org_id,
          connection_id: selectedConnectionId,
          name: `${formData.name} (Query)`,
          description: formData.description,
          sql_query: sqlQuery,
          parameters: queryParams,
          created_by: userProfile?.id
        })
        .select()
        .single();

      if (queryError) {
        throw queryError;
      }

      // Then create the dataset
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          org_id: userProfile?.org_id,
          saved_query_id: savedQuery.id,
          name: formData.name,
          description: formData.description,
          cache_ttl_seconds: formData.ttl_seconds,
          created_by: userProfile?.id
        })
        .select()
        .single();

      if (datasetError) {
        throw datasetError;
      }

      toast({
        title: "✅ Dataset criado",
        description: `ID: ${dataset.id} com TTL de ${formData.ttl_seconds}s`,
      });

      setShowDatasetDialog(false);
      saveForm.reset();
    } catch (error) {
      console.error('Create dataset error:', error);
      toast({
        title: "Erro ao criar dataset",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!queryResult) return;

    const csvContent = [
      queryResult.columns.join(','),
      ...queryResult.rows.map(row => row.map((cell: any) => 
        typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_result.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!can('sql:run')) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Database className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Você não tem permissão para executar consultas SQL
          </p>
          <BackLink />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackLink />
            <div>
              <h1 className="text-3xl font-bold">Editor SQL</h1>
              <p className="text-muted-foreground mt-2">
                Execute consultas SQL e crie datasets personalizados
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Query Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Editor de Consulta
              </CardTitle>
              <CardDescription>
                Escreva e execute consultas SQL seguras (apenas SELECT)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Selector */}
              <div className="space-y-2">
                <Label>Conexão de Dados</Label>
                <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          {conn.name}
                          <Badge variant="outline" className="text-xs">
                            {conn.connection_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SQL Editor */}
              <div className="space-y-2">
                <Label>Consulta SQL</Label>
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM public.users WHERE created_at > :desde LIMIT 100;"
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>

              {/* Parameters */}
              {Object.keys(queryParams).length > 0 && (
                <div className="space-y-2">
                  <Label>Parâmetros</Label>
                  <div className="grid gap-2">
                    {Object.keys(queryParams).map(paramName => (
                      <div key={paramName} className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground min-w-16">
                          :{paramName}
                        </Label>
                        <Input
                          value={queryParams[paramName]}
                          onChange={(e) => setQueryParams(prev => ({
                            ...prev,
                            [paramName]: e.target.value
                          }))}
                          placeholder="Valor do parâmetro"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={executeQuery} 
                  disabled={executing || !selectedConnectionId}
                  className="flex-1"
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Executar Preview
                </Button>
                
                {can('sql:save') && (
                  <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Salvar Consulta</DialogTitle>
                        <DialogDescription>
                          Salve esta consulta para reutilização futura
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome da Consulta</Label>
                          <Input {...saveForm.register('name')} placeholder="Relatório de vendas mensais" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição (opcional)</Label>
                          <Textarea {...saveForm.register('description')} placeholder="Consulta para análise..." />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={saveQuery} disabled={saving} className="flex-1">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Consulta
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {can('datasets:create') && (
                  <Dialog open={showDatasetDialog} onOpenChange={setShowDatasetDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <BarChart className="w-4 h-4 mr-2" />
                        Dataset
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Dataset</DialogTitle>
                        <DialogDescription>
                          Transforme esta consulta em um dataset reutilizável para dashboards
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do Dataset</Label>
                          <Input {...saveForm.register('name')} placeholder="Vendas por região" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição (opcional)</Label>
                          <Textarea {...saveForm.register('description')} placeholder="Dataset para análise..." />
                        </div>
                        <div className="space-y-2">
                          <Label>TTL do Cache (segundos)</Label>
                          <Select 
                            value={saveForm.watch('ttl_seconds')?.toString()} 
                            onValueChange={(value) => saveForm.setValue('ttl_seconds', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">5 minutos</SelectItem>
                              <SelectItem value="900">15 minutos</SelectItem>
                              <SelectItem value="3600">1 hora</SelectItem>
                              <SelectItem value="14400">4 horas</SelectItem>
                              <SelectItem value="86400">1 dia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={createDataset} disabled={saving} className="flex-1">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart className="w-4 h-4 mr-2" />}
                            Criar Dataset
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Query Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Resultado
                </span>
                {queryResult && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {queryResult.elapsed_ms}ms
                    </Badge>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Resultados da consulta SQL executada
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!queryResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Execute uma consulta para ver os resultados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{queryResult.total_rows} linhas</span>
                    {queryResult.truncated && (
                      <Badge variant="secondary">Truncado (limite 1000)</Badge>
                    )}
                  </div>
                  
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {queryResult.columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {row.map((cell: any, cellIdx: number) => (
                              <td key={cellIdx} className="px-3 py-2">
                                {cell === null ? (
                                  <span className="text-muted-foreground italic">null</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}