import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileText, Download, Search, Loader2 } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataHubStore } from "@/hooks/useDataHubStore";
import { DataHubHeader } from "./DataHubHeader";

interface TableInfo {
  name: string;
  kind: 'table' | 'view' | 'materialized_view' | 'foreign_table';
  columns: Array<{ name: string; type: string }>;
  column_count: number;
}

interface PreviewData {
  columns: any[];
  rows: any[];
  truncated?: boolean;
}

export function CatalogPanel() {
  const { userProfile } = useSession();
  const { toast } = useToast();
  
  const {
    selectedConnectionId,
    selectedSchema,
    selectedTable,
    selectTableAndGenerateSQL,
    setSelectedSchema,
    setSelectedTable
  } = useDataHubStore();
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState("");
  const [datasetName, setDatasetName] = useState("");

  // Get current table info from sidebar state
  const [connections, setConnections] = useState<any[]>([]);
  const [catalogData, setCatalogData] = useState<any>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadCatalog();
    }
  }, [selectedConnectionId]);

  useEffect(() => {
    if (selectedSchema && selectedTable) {
      handlePreview(selectedSchema, selectedTable);
    }
  }, [selectedSchema, selectedTable]);

  const loadConnections = async () => {
    if (!userProfile?.org_id) return;

    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('id, name, connection_type, is_active')
        .eq('account_id', userProfile.org_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadCatalog = async () => {
    if (!userProfile?.org_id || !selectedConnectionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('list-database-catalog', {
        body: {
          org_id: userProfile.org_id,
          connection_id: selectedConnectionId
        }
      });

      if (error) throw error;
      setCatalogData(data || {});
    } catch (error) {
      console.error('Error loading catalog:', error);
    }
  };

  const handlePreview = async (schema: string, name: string, offset: number = 0) => {
    if (!selectedConnectionId) return;
    
    setIsLoadingPreview(true);

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
    if (!selectedConnectionId || !datasetName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Digite um nome para o dataset",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedConnection = connections.find(c => c.id === selectedConnectionId);
      if (!selectedConnection) return;

      let sql = '';
      if (selectedConnection.connection_type === 'postgresql') {
        sql = `SELECT * FROM "${schema}"."${name}" LIMIT 1000`;
      } else if (selectedConnection.connection_type === 'mysql') {
        sql = `SELECT * FROM \`${schema}\`.\`${name}\` LIMIT 1000`;
      }

      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          org_id: userProfile?.org_id,
          name: datasetName.trim(),
          description: `Dataset gerado a partir de ${schema}.${name}`,
          sql_query: sql,
          connection_id: selectedConnectionId,
          created_by: userProfile?.id
        })
        .select()
        .single();

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
        description: `Fonte de dados "${datasetName.trim()}" salva com sucesso`,
      });
      
      setDatasetName("");
    } catch (error: any) {
      console.error('Error saving dataset:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar fonte de dados",
        variant: "destructive",
      });
    }
  };

  const generateSQL = () => {
    if (!selectedSchema || !selectedTable || !selectedConnectionId) return;
    
    const connection = connections.find(c => c.id === selectedConnectionId);
    if (connection) {
      selectTableAndGenerateSQL(selectedSchema, selectedTable, connection.connection_type);
      toast({
        title: "SQL Gerado",
        description: "Query SQL gerada no editor",
      });
    }
  };

  const handleBackToList = () => {
    setSelectedSchema(null);
    setSelectedTable(null);
  };

  const selectedTableInfo = selectedTable && catalogData?.schemas
    ?.find((s: any) => s.name === selectedSchema)
    ?.tables?.find((t: any) => t.name === selectedTable);

  const filteredColumns = selectedTableInfo?.columns?.filter((column: any) =>
    column.name.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
    column.type.toLowerCase().includes(columnSearchQuery.toLowerCase())
  ) || [];

  if (!selectedSchema || !selectedTable) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Eye className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecione uma Tabela</h3>
        <p className="text-muted-foreground text-center">
          Escolha uma tabela na barra lateral para explorar seus dados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DataHubHeader
        title={`${selectedSchema}.${selectedTable}`}
        description="Explore os detalhes e dados da tabela selecionada"
        showBackButton={true}
        onBack={handleBackToList}
      >
        <Button
          variant="outline"
          onClick={generateSQL}
        >
          <FileText className="w-4 h-4 mr-2" />
          Gerar SQL
        </Button>
      </DataHubHeader>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="colunas">Colunas</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Tabela</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Caminho</h4>
                  <p className="font-mono text-sm">{selectedSchema}.{selectedTable}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Tipo</h4>
                  <Badge variant="outline" className="text-xs">
                    {selectedTableInfo?.kind || 'Table'}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Total de Colunas</h4>
                  <p className="text-sm">{selectedTableInfo?.column_count || 0}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Salvar como Dataset</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do dataset"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleSaveAsDataset(selectedSchema, selectedTable)}
                    disabled={!datasetName.trim()}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="colunas" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colunas..."
              value={columnSearchQuery}
              onChange={(e) => setColumnSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColumns.map((column: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{column.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {column.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview dos Dados</CardTitle>
              <CardDescription>
                Primeiras 100 linhas da tabela
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : previewData ? (
                <div className="overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.columns.map((col: string, index: number) => (
                          <TableHead key={index} className="font-mono text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row: any[], rowIndex: number) => (
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
                  
                  {previewData.truncated && (
                    <div className="text-center py-4">
                      <Badge variant="outline" className="text-xs">
                        Dados truncados para performance
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Clique no botão "Preview" para carregar os dados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}