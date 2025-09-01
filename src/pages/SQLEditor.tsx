import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, Square, Save, Download, Database, Clock, Loader2, AlertCircle } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getTypeLabel } from "@/modules/connections/utils/normalizeConnectionType";

interface Connection {
  id: string;
  name: string;
  connection_type: string;
  is_active: boolean;
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  truncated?: boolean;
  elapsed_ms?: number;
  total_rows?: number;
}

interface QueryParams {
  [key: string]: string | number | boolean;
}

export default function SQLEditor() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [sql, setSql] = useState("SELECT 1 as id, 'Exemplo' as name, NOW() as timestamp;");
  const [queryParams, setQueryParams] = useState<QueryParams>({});
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [rowLimit, setRowLimit] = useState(1000);
  const [timeout, setTimeout] = useState(15);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");

  // Detect parameters in SQL
  const detectParameters = (sql: string) => {
    const paramRegex = /:(\w+)\b/g;
    const params = new Set<string>();
    let match;
    
    while ((match = paramRegex.exec(sql)) !== null) {
      params.add(match[1]);
    }
    
    return Array.from(params);
  };

  const detectedParams = detectParameters(sql);

  useEffect(() => {
    loadConnections();
  }, []);

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
      toast({
        title: "Erro",
        description: "Falha ao carregar conexões",
        variant: "destructive",
      });
    } finally {
      setLoadingConnections(false);
    }
  };

  const executeQuery = async (mode: 'preview' | 'dataset' = 'preview') => {
    if (!userProfile?.org_id || !selectedConnectionId || !sql.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma conexão e insira uma consulta SQL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId,
          sql: sql.trim(),
          params: queryParams,
          row_limit: rowLimit,
          timeout_ms: timeout * 1000,
          mode
        }
      });

      if (error) {
        console.error('SQL execution error:', error);
        toast({
          title: "Erro na execução",
          description: "Falha ao executar consulta SQL",
          variant: "destructive",
        });
        return;
      }

      if (data.error_code) {
        toast({
          title: `❌ ${data.error_code}`,
          description: data.message,
          variant: "destructive",
        });
        return;
      }

      setQueryResult(data);
      
      if (mode === 'dataset') {
        toast({
          title: "✅ Dataset criado",
          description: `Query executada e dataset criado com ${data.rows?.length || 0} linhas`,
        });
      } else {
        toast({
          title: "✅ Query executada",
          description: `${data.rows?.length || 0} linhas retornadas em ${data.elapsed_ms}ms`,
        });
      }
    } catch (error) {
      console.error('SQL execution error:', error);
      toast({
        title: "Erro na execução",
        description: "Falha ao executar consulta SQL",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveQuery = async () => {
    if (!sql.trim()) {
      toast({
        title: "Consulta vazia",
        description: "Digite uma consulta SQL primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile?.org_id,
          name: queryName || `Consulta ${new Date().toLocaleString('pt-BR')}`,
          description: queryDescription,
          sql_query: sql,
          connection_id: selectedConnectionId,
          parameters: queryParams,
          created_by: userProfile?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✅ Consulta salva",
        description: "Consulta salva com sucesso!",
      });

      setShowSaveDialog(false);
      setQueryName("");
      setQueryDescription("");
    } catch (error: any) {
      console.error('Error saving query:', error);
      toast({
        title: "Erro ao salvar",
        description: "Falha ao salvar consulta",
        variant: "destructive",
      });
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    if (!queryResult?.rows?.length) {
      toast({
        title: "Sem dados",
        description: "Execute uma consulta primeiro",
        variant: "destructive",
      });
      return;
    }

    const data = queryResult.rows;
    const columns = queryResult.columns;

    if (format === 'csv') {
      const csvContent = [
        columns.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'query-result.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonData = data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'query-result.json';
      link.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "✅ Dados exportados",
      description: `Dados exportados em formato ${format.toUpperCase()}`,
    });
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
                Execute consultas SELECT e crie datasets a partir dos resultados
              </p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            SELECT Only
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Editor de Consultas</CardTitle>
            <CardDescription>Escreva consultas SELECT para explorar seus dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Conexão</Label>
                <Select value={selectedConnectionId || ''} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.name} - {getTypeLabel(connection.connection_type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parameters Panel */}
              {detectedParams.length > 0 && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium">Parâmetros Detectados</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {detectedParams.map((param) => (
                      <div key={param} className="space-y-2">
                        <Label htmlFor={param} className="text-xs">:{param}</Label>
                        <Input
                          id={param}
                          value={String(queryParams[param] || '')}
                          onChange={(e) => setQueryParams(prev => ({
                            ...prev,
                            [param]: e.target.value
                          }))}
                          placeholder={`Valor para ${param}`}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Consulta SQL</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Timeout: {timeout}s | Limite: {rowLimit} linhas
                  </div>
                </div>
                <Textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="SELECT * FROM tabela WHERE data >= :data_inicio LIMIT 100;"
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => executeQuery('preview')}
                  disabled={loading || !selectedConnectionId}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Executar Preview
                </Button>

                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!sql.trim()}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Consulta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Salvar Consulta</DialogTitle>
                      <DialogDescription>
                        Salve sua consulta para reutilização futura
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="query-name">Nome da Consulta</Label>
                        <Input
                          id="query-name"
                          value={queryName}
                          onChange={(e) => setQueryName(e.target.value)}
                          placeholder="Minha consulta"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="query-description">Descrição (opcional)</Label>
                        <Textarea
                          id="query-description"
                          value={queryDescription}
                          onChange={(e) => setQueryDescription(e.target.value)}
                          placeholder="Descrição da consulta..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveQuery} className="flex-1">
                          Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {can('datasets:create') && (
                  <Button
                    variant="outline"
                    onClick={() => executeQuery('dataset')}
                    disabled={loading || !selectedConnectionId}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Criar Dataset
                  </Button>
                )}
              </div>

              {queryResult && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Resultados</h3>
                      <p className="text-sm text-muted-foreground">
                        {queryResult.rows?.length || 0} linhas
                        {queryResult.truncated && " (limitado)"}
                        {queryResult.elapsed_ms && ` • ${queryResult.elapsed_ms}ms`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportData('csv')}
                        disabled={!queryResult.rows?.length}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportData('json')}
                        disabled={!queryResult.rows?.length}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        JSON
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded overflow-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {queryResult.columns.map((column) => (
                            <th key={column} className="p-2 text-left font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 max-w-xs truncate">
                                {cell?.toString() || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}