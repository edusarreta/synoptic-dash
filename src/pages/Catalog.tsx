import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronRight, Database, Table, Columns, Globe, Eye, Loader2, X, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
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

interface Schema {
  name: string;
  tables: Table[];
}

interface Table {
  name: string;
  columns?: Column[];
  column_count?: number;
}

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
}

interface CatalogData {
  db?: string;
  schemas?: Schema[];
  resources?: any[];
}

interface PreviewData {
  columns: string[];
  rows: any[][];
  total_rows?: number;
}

export default function Catalog() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [selectedTable, setSelectedTable] = useState<{ schema: string; table: string } | null>(null);
  const [previewOffset, setPreviewOffset] = useState(0);

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
      // Debug connection first
      console.log('🧪 Running connection debug...');
      const debugResult = await supabase.functions.invoke('debug-connection', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId
        }
      });

      console.log('🧪 Debug result:', debugResult);

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

  const loadTablePreview = async (schemaName: string, tableName: string, offset: number = 0) => {
    if (!userProfile?.org_id || !selectedConnectionId) return;

    setLoadingPreview(true);
    setSelectedTable({ schema: schemaName, table: tableName });
    setPreviewOffset(offset);

    try {
      const { data, error } = await supabase.functions.invoke('preview-table', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId,
          schema: schemaName,
          table: tableName,
          limit: 50,
          offset
        }
      });

      if (error) {
        console.error('Error loading preview:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar preview da tabela",
          variant: "destructive",
        });
        return;
      }

      if (data && data.success) {
        setPreviewData({
          columns: data.columns?.map((col: any) => col.name || col.column_name) || [],
          rows: data.rows || [],
          total_rows: data.total || data.total_count || 0
        });
      } else {
        toast({
          title: "Erro",
          description: data?.message || "Falha ao carregar preview da tabela",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar preview da tabela",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const saveAsDataSource = async () => {
    if (!selectedTable || !userProfile?.org_id || !selectedConnectionId) return;

    try {
      // Create a saved query for the table
      const { error: queryError } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile.org_id,
          name: `${selectedTable.schema}.${selectedTable.table}`,
          description: `Tabela ${selectedTable.table} do schema ${selectedTable.schema}`,
          sql_query: `SELECT * FROM ${selectedTable.schema}.${selectedTable.table}`,
          connection_id: selectedConnectionId,
          created_by: userProfile.id
        });

      if (queryError) {
        console.error('Error saving query:', queryError);
        toast({
          title: "Erro", 
          description: "Falha ao salvar como fonte de dados",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Tabela salva como fonte de dados",
      });
    } catch (error) {
      console.error('Error saving as data source:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar como fonte de dados", 
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

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);

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
                Explore schemas, tabelas e colunas das suas fontes de dados
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Catalog Tree */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conexões</CardTitle>
                <CardDescription>Selecione uma fonte de dados</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConnections ? (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : connections.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma conexão ativa encontrada
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
                            {connection.connection_type === 'rest' ? (
                              <Globe className="w-4 h-4" />
                            ) : (
                              <Database className="w-4 h-4" />
                            )}
                            <span>{connection.name}</span>
                            <Badge variant="outline" className="ml-auto">
                              {getTypeLabel(connection.connection_type)}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Estrutura</CardTitle>
                      <CardDescription>
                        {selectedConnection.connection_type === 'rest' ? 'APIs e Recursos' : 'Schemas e Tabelas'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadCatalog}
                      disabled={loadingCatalog}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingCatalog ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCatalog ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : catalogData ? (
                    <div className="space-y-2">
                      {selectedConnection.connection_type === 'rest' ? (
                        // REST Resources
                        <div className="space-y-2">
                          {catalogData.resources?.map((resource, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => loadTablePreview('api', resource.name)}
                            >
                              <Globe className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">{resource.name}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {resource.method || 'GET'}
                              </Badge>
                            </div>
                          )) || (
                            <p className="text-muted-foreground text-sm">Nenhum recurso configurado</p>
                          )}
                        </div>
                      ) : (
                        // Database Schemas
                        catalogData.schemas?.map((schema) => (
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
                                {schema.tables?.length || 0} tabelas
                              </Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="ml-6 space-y-1">
                              {schema.tables?.map((table) => (
                                <div
                                  key={table.name}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                  onClick={() => loadTablePreview(schema.name, table.name)}
                                >
                                  <Table className="w-4 h-4 text-green-500" />
                                  <span className="text-sm">{table.name}</span>
                                   <Badge variant="outline" className="ml-auto text-xs">
                                     {table.column_count || 0} colunas
                                   </Badge>
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        )) || (
                          <p className="text-muted-foreground text-sm">Nenhum schema encontrado</p>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Carregue uma conexão para ver a estrutura</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Table Details & Preview */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTable ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedTable.schema}.{selectedTable.table}
                    </CardTitle>
                    <CardDescription>
                      Estrutura da tabela e preview dos dados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Column Information */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Columns className="w-4 h-4" />
                          Colunas
                        </h4>
                        <div className="grid gap-2">
                          {catalogData?.schemas
                            ?.find(s => s.name === selectedTable.schema)
                            ?.tables?.find(t => t.name === selectedTable.table)
                            ?.columns?.map((column) => (
                              <div key={column.name} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div>
                                  <span className="font-medium">{column.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {column.type}
                                  </Badge>
                                </div>
                                {column.nullable && (
                                  <Badge variant="secondary" className="text-xs">nullable</Badge>
                                )}
                              </div>
                            )) || (
                            <p className="text-muted-foreground text-sm">Informações de coluna não disponíveis</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Data Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Preview dos Dados
                          </h4>
                           <div className="flex items-center gap-2">
                             {previewData?.total_rows && (
                               <Badge variant="outline">
                                 {previewData.total_rows} linhas total
                               </Badge>
                             )}
                             {selectedConnection && (
                               <Badge variant="secondary" className="text-xs">
                                 Fonte: {selectedConnection.name}
                               </Badge>
                             )}
                             <Button 
                               size="sm" 
                               onClick={saveAsDataSource}
                               disabled={!selectedTable}
                             >
                               Salvar como Fonte de Dados
                             </Button>
                           </div>
                        </div>
                        
                        {loadingPreview ? (
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : previewData ? (
                          <>
                            <div className="border rounded overflow-x-auto max-h-96">
                              <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                  <tr>
                                    {previewData.columns.map((column) => (
                                      <th key={column} className="p-2 text-left font-medium">
                                        {column}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {previewData.rows.map((row, index) => (
                                    <tr key={index} className="border-t hover:bg-muted/50">
                                      {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="p-2">
                                          {typeof cell === 'object' && cell !== null ? JSON.stringify(cell) : String(cell || '')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Pagination controls */}
                            <div className="flex items-center justify-between mt-4">
                              <div className="text-sm text-muted-foreground">
                                Mostrando {previewData.rows.length} de {previewData.total_rows} linhas
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (selectedTable) {
                                      loadTablePreview(selectedTable.schema, selectedTable.table, 0);
                                    }
                                  }}
                                  disabled={loadingPreview || previewOffset === 0}
                                >
                                  <ArrowLeft className="w-3 h-3 mr-1" />
                                  Primeira
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (selectedTable) {
                                      const nextOffset = previewOffset + 50;
                                      if (nextOffset < (previewData.total_rows || 0)) {
                                        loadTablePreview(selectedTable.schema, selectedTable.table, nextOffset);
                                      }
                                    }
                                  }}
                                  disabled={
                                    loadingPreview || 
                                    !previewData || 
                                    previewOffset + previewData.rows.length >= (previewData.total_rows || 0)
                                  }
                                >
                                  Próxima
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">Selecione uma tabela para ver o preview</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione uma Tabela</h3>
                  <p className="text-muted-foreground text-center">
                    Escolha uma tabela ou recurso da árvore à esquerda para ver detalhes e preview
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