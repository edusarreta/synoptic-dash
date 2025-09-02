import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Save, Download, Clock, Loader2, AlertCircle } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataHubStore } from "@/hooks/useDataHubStore";

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

export function SQLEditorPanel() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const {
    selectedConnectionId,
    sqlQuery,
    setSQLQuery,
    queryResults,
    setQueryResults,
    isLoadingSQL,
    setLoadingSQL
  } = useDataHubStore();
  
  const [queryParams, setQueryParams] = useState<QueryParams>({});
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

  const detectedParams = detectParameters(sqlQuery);

  const executeQuery = async (mode: 'preview' | 'dataset' = 'preview') => {
    if (!userProfile?.org_id || !selectedConnectionId || !sqlQuery.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma conexão e insira uma consulta SQL",
        variant: "destructive",
      });
      return;
    }

    setLoadingSQL(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId,
          sql: sqlQuery.trim(),
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

      setQueryResults(data);
      
      if (mode === 'dataset') {
        try {
          const { data: datasetData, error: datasetError } = await supabase
            .from('datasets')
            .insert({
              org_id: userProfile.org_id,
              name: `Dataset ${new Date().toLocaleString('pt-BR')}`,
              description: `Dataset criado a partir da consulta SQL`,
              cache_ttl_seconds: 300,
              data_schema: {
                columns: data.columns,
                row_count: data.rows?.length || 0
              },
              last_updated: new Date().toISOString(),
              created_by: userProfile.id
            })
            .select()
            .single();

          if (datasetError) {
            console.error('Dataset creation error:', datasetError);
            toast({
              title: "⚠️ Query executada",
              description: `Query executada com ${data.rows?.length || 0} linhas, mas dataset não foi criado`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "✅ Dataset criado",
              description: `Dataset criado com ID: ${datasetData.id} (${data.rows?.length || 0} linhas)`,
            });
          }
        } catch (datasetError) {
          console.error('Dataset creation error:', datasetError);
          toast({
            title: "⚠️ Query executada",
            description: `Query executada com ${data.rows?.length || 0} linhas, mas dataset não foi criado`,
            variant: "destructive",
          });
        }
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
      setLoadingSQL(false);
    }
  };

  const saveQuery = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "Consulta vazia",
        description: "Digite uma consulta SQL primeiro",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.org_id || !userProfile?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile.org_id,
          name: queryName || `Consulta ${new Date().toLocaleString('pt-BR')}`,
          description: queryDescription || null,
          sql_query: sqlQuery,
          connection_id: selectedConnectionId,
          parameters: Object.keys(queryParams).length > 0 ? queryParams : {},
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) {
        console.error('Save query error:', error);
        throw error;
      }

      toast({
        title: "✅ Consulta salva",
        description: `Consulta salva com ID: ${data.id}`,
      });

      setShowSaveDialog(false);
      setQueryName("");
      setQueryDescription("");
    } catch (error: any) {
      console.error('Error saving query:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Falha ao salvar consulta",
        variant: "destructive",
      });
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    if (!queryResults?.rows?.length) {
      toast({
        title: "Sem dados",
        description: "Execute uma consulta primeiro",
        variant: "destructive",
      });
      return;
    }

    const data = queryResults.rows;
    const columns = queryResults.columns;

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

  if (!selectedConnectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecione uma Conexão</h3>
        <p className="text-muted-foreground text-center">
          Escolha uma conexão na barra lateral para começar a escrever queries SQL
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editor SQL</h2>
          <p className="text-muted-foreground">
            Execute consultas SELECT e crie datasets a partir dos resultados
          </p>
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
                value={sqlQuery}
                onChange={(e) => setSQLQuery(e.target.value)}
                placeholder="SELECT * FROM schema.tabela WHERE data >= :data_inicio LIMIT 100;"
                className="font-mono text-sm min-h-[200px]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => executeQuery('preview')}
                disabled={isLoadingSQL || !selectedConnectionId}
              >
                {isLoadingSQL ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Executar Preview
              </Button>

              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!sqlQuery.trim()}>
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
                  disabled={isLoadingSQL || !selectedConnectionId}
                >
                  Criar Dataset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {queryResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados da Consulta</CardTitle>
                <CardDescription>
                  {queryResults.rows?.length || 0} linhas retornadas
                  {queryResults.elapsed_ms && ` em ${queryResults.elapsed_ms}ms`}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('csv')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('json')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {queryResults.columns?.map((col: string, index: number) => (
                      <TableHead key={index} className="font-mono text-xs">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryResults.rows?.map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex} className="text-xs max-w-32 truncate">
                          {cell !== null ? String(cell) : <span className="text-muted-foreground italic">null</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {queryResults.truncated && (
                <div className="text-center py-4">
                  <Badge variant="outline" className="text-xs">
                    Resultados truncados para performance
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}