import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Table as TableIcon, Eye, FileText, Layers, ExternalLink, Download, ChevronRight, ChevronDown, Search } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getConnectionTypeLabel } from "@/modules/connections/connectionTypes";

interface Connection {
  id: string;
  name: string;
  connection_type: string;
  is_active: boolean;
}

interface TableInfo {
  name: string;
  kind: 'table' | 'view' | 'materialized_view' | 'foreign_table';
  columns: Array<{ name: string; type: string }>;
  column_count: number;
}

interface Schema {
  name: string;
  tables: TableInfo[];
}

interface CatalogData {
  db?: string;
  schemas?: Schema[];
}

export default function Catalog() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [previewData, setPreviewData] = useState<{ columns: any[], rows: any[], truncated?: boolean } | null>(null);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string } | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadCatalog();
    }
  }, [selectedConnectionId]);

  const loadConnections = async () => {
    if (!userProfile?.org_id) return;

    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, is_active')
        .eq('account_id', userProfile.org_id)
        .eq('is_active', true)
        .in('connection_type', ['postgresql', 'mysql'])
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

  const loadCatalog = async () => {
    if (!userProfile?.org_id || !selectedConnectionId) return;

    setLoadingCatalog(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-database-catalog', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId
        }
      });

      if (error) {
        console.error('Error loading catalog:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar catálogo",
          variant: "destructive",
        });
        return;
      }

      setCatalogData(data || {});
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar catálogo",
        variant: "destructive",
      });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handlePreview = async (schema: string, name: string, offset: number = 0) => {
    if (!selectedConnectionId) return;
    
    setIsLoadingPreview(true);
    setPreviewOffset(offset);
    setSelectedTable({ schema, name });

    try {
      const { data, error } = await supabase.functions.invoke('preview-table', {
        body: {
          org_id: userProfile?.org_id,
          connection_id: selectedConnectionId,
          schema,
          table: name,
          limit: 100,
          offset
        }
      });

      if (error) {
        console.error('Error loading preview:', error);
        toast({
          title: "Erro",
          description: error.message || "Falha ao carregar preview da tabela",
          variant: "destructive",
        });
        return;
      }

      setPreviewData(data);
    } catch (error: any) {
      console.error('Error loading preview:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao carregar preview da tabela",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSaveAsDataset = async (schema: string, name: string) => {
    if (!selectedConnectionId) return;

    try {
      const selectedConnection = connections.find(c => c.id === selectedConnectionId);
      if (!selectedConnection) return;

      let sql = '';
      if (selectedConnection.connection_type === 'postgresql') {
        sql = `SELECT * FROM "${schema}"."${name}" LIMIT 1000`;
      } else if (selectedConnection.connection_type === 'mysql') {
        sql = `SELECT * FROM \`${schema}\`.\`${name}\` LIMIT 1000`;
      }

      const { data, error } = await supabase.functions.invoke('run-sql-query', {
        body: {
          org_id: userProfile?.org_id,
          connection_id: selectedConnectionId,
          sql_query: sql,
          mode: 'dataset',
          dataset_name: `${schema}_${name}`,
          description: `Dataset gerado a partir de ${schema}.${name}`
        }
      });

      if (error) {
        console.error('Error saving dataset:', error);
        toast({
          title: "Erro",
          description: "Falha ao salvar fonte de dados",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: `Fonte de dados "${schema}_${name}" salva com sucesso`,
      });
    } catch (error: any) {
      console.error('Error saving dataset:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar fonte de dados",
        variant: "destructive",
      });
    }
  };

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const getTableIcon = (kind: string) => {
    switch (kind) {
      case 'view':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'materialized_view':
        return <Layers className="h-4 w-4 text-purple-500" />;
      case 'foreign_table':
        return <ExternalLink className="h-4 w-4 text-orange-500" />;
      default:
        return <TableIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTableTypeLabel = (kind: string) => {
    switch (kind) {
      case 'view':
        return 'View';
      case 'materialized_view':
        return 'Materialized View';
      case 'foreign_table':
        return 'Foreign Table';
      default:
        return 'Table';
    }
  };

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const selectedTableInfo = selectedTable && catalogData?.schemas
    ?.find(s => s.name === selectedTable.schema)
    ?.tables?.find(t => t.name === selectedTable.name);

  const filteredColumns = selectedTableInfo?.columns?.filter(column =>
    column.name.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
    column.type.toLowerCase().includes(columnSearchQuery.toLowerCase())
  ) || [];

  if (!can('catalog:read')) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Database className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Você não tem permissão para visualizar o catálogo
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
              <h1 className="text-3xl font-bold">Catálogo de Dados</h1>
              <p className="text-muted-foreground mt-2">
                Explore schemas, tabelas, views e colunas das suas fontes de dados
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Connections & Catalog Tree */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conexões SQL</CardTitle>
                <CardDescription>Selecione uma fonte de dados</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConnections ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : connections.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma conexão SQL ativa encontrada
                  </p>
                ) : (
                  <Select value={selectedConnectionId || ''} onValueChange={setSelectedConnectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conexão" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            <span>{connection.name}</span>
                            <Badge variant="outline" className="ml-auto">
                              {getConnectionTypeLabel(connection.connection_type)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {selectedConnection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estrutura</CardTitle>
                  <CardDescription>Schemas, tabelas e views</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCatalog ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : catalogData?.schemas && catalogData.schemas.length > 0 ? (
                    <div className="space-y-2">
                      {catalogData.schemas.map((schema) => (
                        <Collapsible
                          key={schema.name}
                          open={expandedSchemas.has(schema.name)}
                          onOpenChange={() => toggleSchema(schema.name)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
                            {expandedSchemas.has(schema.name) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <Database className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">{schema.name}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {schema.tables?.length || 0}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="ml-6 space-y-1">
                            {schema.tables?.map((table) => (
                              <div
                                key={table.name}
                                className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                onClick={() => {
                                  setSelectedTable({ schema: schema.name, name: table.name });
                                }}
                              >
                                {getTableIcon(table.kind)}
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{table.name}</div>
                                  <span className="text-xs text-muted-foreground">{getTableTypeLabel(table.kind)}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {table.column_count}
                                </Badge>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum schema encontrado</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Table Details & Preview */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTable && selectedTableInfo ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedTable.schema}.{selectedTable.name}
                  </CardTitle>
                  <CardDescription>
                    Detalhes e preview dos dados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="resumo" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="resumo">Resumo</TabsTrigger>
                      <TabsTrigger value="colunas">Colunas</TabsTrigger>
                      <TabsTrigger value="dados">Dados (Preview)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="resumo" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Caminho</h4>
                          <p className="font-mono text-sm">{selectedTable.schema}.{selectedTable.name}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Tipo</h4>
                          <Badge variant="outline" className="text-xs">
                            {getTableTypeLabel(selectedTableInfo.kind)}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Total de Colunas</h4>
                          <p className="text-sm">{selectedTableInfo.column_count}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground">Ações</h4>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePreview(selectedTable.schema, selectedTable.name, 0)}
                              disabled={isLoadingPreview}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {isLoadingPreview ? "Carregando..." : "Preview"}
                            </Button>
                            
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleSaveAsDataset(selectedTable.schema, selectedTable.name)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Salvar como Fonte de Dados
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="colunas" className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Buscar colunas..."
                          value={columnSearchQuery}
                          onChange={(e) => setColumnSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <div className="border rounded">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredColumns.map((column) => (
                              <TableRow key={column.name}>
                                <TableCell className="font-medium">{column.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {column.type}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {filteredColumns.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">
                                  {columnSearchQuery ? 'Nenhuma coluna encontrada' : 'Nenhuma coluna disponível'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="dados" className="space-y-4">
                      {!previewData ? (
                        <div className="text-center py-8">
                          <Button 
                            variant="outline"
                            onClick={() => handlePreview(selectedTable.schema, selectedTable.name, 0)}
                            disabled={isLoadingPreview}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {isLoadingPreview ? "Carregando..." : "Carregar Preview (100)"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Dados de Preview</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(selectedTable?.schema || '', selectedTable?.name || '', Math.max(0, previewOffset - 100))}
                                disabled={previewOffset === 0 || isLoadingPreview}
                              >
                                Anterior
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {previewOffset + 1} - {previewOffset + previewData.rows.length}
                                {previewData.truncated && ' (mais dados disponíveis)'}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(selectedTable?.schema || '', selectedTable?.name || '', previewOffset + 100)}
                                disabled={!previewData.truncated || isLoadingPreview}
                              >
                                Próximo
                              </Button>
                            </div>
                          </div>
                          
                          <div className="border rounded overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {previewData.columns.map((column, index) => (
                                    <TableHead key={index} className="whitespace-nowrap">
                                      <div>
                                        <div className="font-medium">{column.name}</div>
                                        <div className="text-xs text-muted-foreground">{column.type}</div>
                                      </div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.rows.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {previewData.columns.map((column, colIndex) => (
                                      <TableCell key={colIndex} className="max-w-[200px] truncate">
                                        {row[column.name]?.toString() || ''}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <TableIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione uma tabela</h3>
                  <p className="text-muted-foreground text-center">
                    Escolha uma tabela ou view na estrutura à esquerda para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}