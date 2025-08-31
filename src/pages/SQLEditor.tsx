import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Download, Save, Database, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/providers/SessionProvider';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  host: string;
  database_name: string;
}

interface QueryResult {
  columns: Array<{ name: string; }>;
  rows: Array<Record<string, any>>;
  truncated: boolean;
  elapsed_ms: number;
  row_count: number;
}

export default function SQLEditor() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState('SELECT now() as current_time;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [rowLimit, setRowLimit] = useState(5000);
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [queryParams, setQueryParams] = useState<Record<string, any>>({});
  
  const { toast } = useToast();
  const { userProfile } = useSession();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, host, database_name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setConnections(data || []);
      if (data && data.length > 0 && !selectedConnectionId) {
        setSelectedConnectionId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conexões de dados",
        variant: "destructive",
      });
    }
  };

  const executeQuery = async () => {
    if (!selectedConnectionId || !sqlQuery.trim()) {
      toast({
        title: "Erro",
        description: "Selecione uma conexão e digite uma query",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.org_id) {
      toast({
        title: "Erro",
        description: "Usuário não está associado a uma organização",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setQueryError('');
    setQueryResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId,
          sql: sqlQuery,
          params: queryParams,
          row_limit: rowLimit,
          timeout_ms: timeoutMs,
          mode: 'preview'
        }
      });

      if (error) throw error;

      if (data.error_code) {
        setQueryError(data.message || 'Erro na execução da query');
        toast({
          title: "Erro na Query",
          description: data.message,
          variant: "destructive",
        });
      } else {
        setQueryResult(data);
        toast({
          title: "Query Executada",
          description: `${data.row_count} linhas retornadas em ${data.elapsed_ms}ms`,
        });
      }
    } catch (error: any) {
      console.error('Erro ao executar query:', error);
      const errorMessage = error.message || 'Falha ao executar query';
      setQueryError(errorMessage);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelQuery = () => {
    setIsExecuting(false);
    toast({
      title: "Query Cancelada",
      description: "Execução da query foi cancelada",
    });
  };

  const exportResults = (format: 'csv' | 'json') => {
    if (!queryResult || !queryResult.rows.length) {
      toast({
        title: "Aviso",
        description: "Nenhum resultado para exportar",
        variant: "destructive",
      });
      return;
    }

    let content = '';
    let filename = '';

    if (format === 'csv') {
      const headers = queryResult.columns.map(col => col.name).join(',');
      const rows = queryResult.rows.map(row => 
        queryResult.columns.map(col => {
          const value = row[col.name];
          return value !== null && value !== undefined ? `"${String(value).replace(/"/g, '""')}"` : '';
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = 'query_results.csv';
    } else {
      content = JSON.stringify(queryResult.rows, null, 2);
      filename = 'query_results.json';
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado",
      description: `Resultados exportados como ${format.toUpperCase()}`,
    });
  };

  const selectedConnection = connections.find(conn => conn.id === selectedConnectionId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Editor SQL
            </h1>
            <Badge variant="secondary" className="text-xs">
              SELECT-only
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione uma conexão" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>{conn.name}</span>
                      <span className="text-xs text-muted-foreground">({conn.connection_type})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedConnection && (
          <div className="mt-2 text-sm text-muted-foreground">
            Conectado em: {selectedConnection.host} → {selectedConnection.database_name}
          </div>
        )}
      </div>

      {/* Editor and Controls */}
      <div className="flex-1 flex">
        {/* Left Panel - Query Editor */}
        <div className="flex-1 flex flex-col border-r">
          <div className="border-b p-3 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={executeQuery}
                disabled={isExecuting || !selectedConnectionId}
                className="gap-1"
              >
                <Play className="w-3 h-3" />
                Run
              </Button>
              
              {isExecuting && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={cancelQuery}
                  className="gap-1"
                >
                  <Square className="w-3 h-3" />
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Label>Limite:</Label>
                <Input
                  type="number"
                  value={rowLimit}
                  onChange={(e) => setRowLimit(parseInt(e.target.value) || 5000)}
                  className="w-16 h-6 text-xs"
                  min="1"
                  max="50000"
                />
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <Input
                  type="number"
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 15000)}
                  className="w-16 h-6 text-xs"
                  min="1000"
                  max="300000"
                />
                <span>ms</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-3">
            <Textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Digite sua query SQL aqui... (apenas SELECT permitido)"
              className="w-full h-full font-mono text-sm resize-none"
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="w-2/3 flex flex-col">
          <div className="border-b p-3 flex items-center justify-between bg-muted/20">
            <h3 className="font-medium">Resultados</h3>
            
            {queryResult && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {queryResult.row_count} linhas · {queryResult.elapsed_ms}ms
                  {queryResult.truncated && ' · truncado'}
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => exportResults('csv')}
                  className="gap-1"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => exportResults('json')}
                  className="gap-1"
                >
                  <Download className="w-3 h-3" />
                  JSON
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3">
            {isExecuting && (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Executando query...</p>
                </div>
              </div>
            )}

            {queryError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">{queryError}</div>
              </div>
            )}

            {queryResult && (
              <div className="border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {queryResult.columns.map((col, index) => (
                        <TableHead key={index} className="font-mono text-xs">
                          {col.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResult.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {queryResult.columns.map((col, colIndex) => (
                          <TableCell key={colIndex} className="font-mono text-xs max-w-xs truncate">
                            {row[col.name] !== null && row[col.name] !== undefined 
                              ? String(row[col.name]) 
                              : <span className="text-muted-foreground italic">null</span>
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {queryResult.truncated && (
                  <div className="p-2 bg-yellow-50 border-t border-yellow-200 text-yellow-800 text-sm text-center">
                    ⚠️ Resultados truncados. Ajuste o limite de linhas para ver mais dados.
                  </div>
                )}
              </div>
            )}

            {!isExecuting && !queryError && !queryResult && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Execute uma query para ver os resultados</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}