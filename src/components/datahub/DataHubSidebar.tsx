import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Database, Table as TableIcon, Eye, Layers, ExternalLink, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataHubStore } from "@/hooks/useDataHubStore";
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

export function DataHubSidebar() {
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const {
    selectedConnectionId,
    selectedSchema,
    selectedTable,
    setSelectedConnection,
    selectTableAndGenerateSQL,
    isLoadingConnections,
    isLoadingCatalog,
    setLoadingConnections,
    setLoadingCatalog
  } = useDataHubStore();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadCatalog();
    } else {
      setCatalogData(null);
    }
  }, [selectedConnectionId]);

  const loadConnections = async () => {
    if (!userProfile?.org_id) return;

    setLoadingConnections(true);
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
        setSelectedConnection(data[0].id);
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

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const handleTableClick = (schema: string, table: string) => {
    const connection = connections.find(c => c.id === selectedConnectionId);
    if (connection) {
      selectTableAndGenerateSQL(schema, table, connection.connection_type);
    }
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

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);

  return (
    <div className="p-4 space-y-4 h-full overflow-auto">
      {/* Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conexões</CardTitle>
          <CardDescription className="text-sm">Fonte de dados ativa</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConnections ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma conexão ativa
            </p>
          ) : (
            <Select value={selectedConnectionId || ''} onValueChange={setSelectedConnection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma conexão" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    <div className="flex items-center gap-2 w-full">
                      <Database className="w-4 h-4" />
                      <span className="flex-1">{connection.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
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

      {/* Schema Explorer */}
      {selectedConnection && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estrutura</CardTitle>
            <CardDescription className="text-sm">
              {selectedConnection.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : catalogData?.schemas && catalogData.schemas.length > 0 ? (
              <div className="space-y-1">
                {catalogData.schemas.map((schema) => (
                  <Collapsible
                    key={schema.name}
                    open={expandedSchemas.has(schema.name)}
                    onOpenChange={() => toggleSchema(schema.name)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted text-left">
                      {expandedSchemas.has(schema.name) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <Database className="w-3 h-3 text-blue-500" />
                      <span className="text-sm font-medium flex-1">{schema.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {schema.tables?.length || 0}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-5 space-y-1">
                      {schema.tables?.map((table) => (
                        <div
                          key={table.name}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
                            ${selectedSchema === schema.name && selectedTable === table.name 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted'}`}
                          onClick={() => handleTableClick(schema.name, table.name)}
                        >
                          {getTableIcon(table.kind)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{table.name}</div>
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
              <p className="text-muted-foreground text-sm text-center py-4">
                Nenhum schema encontrado
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}