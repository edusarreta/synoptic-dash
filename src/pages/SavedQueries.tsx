import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";  
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Play, Calendar, User, Loader2, RefreshCw, Eye } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { useDataHubStore } from "@/hooks/useDataHubStore";

interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  sql_query: string;
  parameters: any;
  connection_id?: string;
  created_at: string;
  created_by: string;
  profiles?: any;
}

export default function SavedQueries() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  const { setSQLQuery, setSelectedConnectionId } = useDataHubStore();
  
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);

  useEffect(() => {
    loadQueries();
  }, [userProfile?.org_id]);

  const loadQueries = async () => {
    if (!userProfile?.org_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .select(`
          *,
          profiles!created_by (
            full_name,
            email
          )
        `)
        .eq('org_id', userProfile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error: any) {
      console.error('Error loading queries:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar consultas salvas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadQueryInEditor = (query: SavedQuery) => {
    setSQLQuery(query.sql_query);
    if (query.connection_id) {
      setSelectedConnectionId(query.connection_id);
    }
    
    toast({
      title: "✅ Query carregada",
      description: `Query "${query.name}" carregada no editor SQL`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <RequirePermission perms={["sql:run"]}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consultas Salvas</h1>
            <p className="text-muted-foreground">
              Visualize e reutilize suas consultas SQL salvas
            </p>
          </div>
          
          <Button onClick={loadQueries} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : queries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma consulta encontrada</h3>
              <p className="text-muted-foreground text-center">
                Use o Editor SQL para salvar suas primeiras consultas
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Consultas Disponíveis</CardTitle>
              <CardDescription>
                {queries.length} consulta{queries.length !== 1 ? 's' : ''} encontrada{queries.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Parâmetros</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queries.map((query) => (
                    <TableRow key={query.id}>
                      <TableCell className="font-medium">
                        {query.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {query.description || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {Object.keys(query.parameters || {}).length > 0 ? (
                          <Badge variant="outline">
                            {Object.keys(query.parameters).length} param{Object.keys(query.parameters).length > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span className="text-sm">
                            {query.profiles?.full_name || query.profiles?.email || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(query.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => loadQueryInEditor(query)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Usar
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedQuery(query)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>{selectedQuery?.name}</DialogTitle>
                                <DialogDescription>
                                  {selectedQuery?.description}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Consulta SQL:</h4>
                                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-auto">
                                    <pre>{selectedQuery?.sql_query}</pre>
                                  </div>
                                </div>
                                
                                {selectedQuery?.parameters && Object.keys(selectedQuery.parameters).length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Parâmetros:</h4>
                                    <div className="bg-muted p-4 rounded-lg">
                                      <pre className="text-sm">
                                        {JSON.stringify(selectedQuery.parameters, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RequirePermission>
  );
}