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
import { usePermissions } from "@/providers/PermissionsProvider";
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

              <div className="space-y-2">
                <Label>Consulta SQL</Label>
                <Textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="SELECT * FROM tabela WHERE coluna = 'valor'"
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
                    <h3 className="text-lg font-semibold">Resultados</h3>
                    <Badge variant="outline">
                      {queryResult.rows?.length || 0} linhas
                    </Badge>
                  </div>
                  
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {queryResult.columns.map((column) => (
                            <th key={column} className="p-2 text-left font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.slice(0, 100).map((row, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                {cell}
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