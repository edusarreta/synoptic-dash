import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Search, Trash2, FileText, Clock, Loader2, AlertCircle } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataHubStore } from "@/hooks/useDataHubStore";

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  sql_query: string;
  connection_id: string;
  parameters: any;
  created_at: string;
  created_by: string;
  connection?: any;
}

export function DatasetsPanel() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const { setSQLQuery, setSelectedConnectionId } = useDataHubStore();
  
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    if (!userProfile?.org_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .select('*')
        .eq('org_id', userProfile.org_id)
        .order('created_at', { ascending: false});

      if (error) {
        console.error('Error loading saved queries:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar datasets salvos",
          variant: "destructive",
        });
        return;
      }

      setSavedQueries(data || []);
    } catch (error) {
      console.error('Error loading saved queries:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar datasets salvos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteQuery = async (queryId: string) => {
    try {
      const { error } = await supabase
        .from('saved_queries')
        .delete()
        .eq('id', queryId)
        .eq('org_id', userProfile?.org_id);

      if (error) {
        console.error('Error deleting query:', error);
        toast({
          title: "Erro",
          description: "Falha ao excluir dataset",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Dataset excluído",
        description: "Dataset removido com sucesso",
      });
      
      loadSavedQueries();
    } catch (error) {
      console.error('Error deleting query:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir dataset",
        variant: "destructive",
      });
    }
  };

  const loadQueryIntoEditor = (query: SavedQuery) => {
    setSQLQuery(query.sql_query);
    if (query.connection_id) {
      setSelectedConnectionId(query.connection_id);
    }
    
    toast({
      title: "Query carregada",
      description: `Query "${query.name}" carregada no editor SQL`,
    });
  };

  const filteredQueries = savedQueries.filter(query =>
    query.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    query.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    query.sql_query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Datasets Salvos</h2>
          <p className="text-muted-foreground">
            Consultas SQL salvas e reutilizáveis
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, descrição ou SQL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredQueries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Package className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {savedQueries.length === 0 ? "Nenhum dataset salvo ainda" : "Nenhum dataset encontrado"}
            </p>
            {savedQueries.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Use o Editor SQL para salvar suas consultas como datasets
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQueries.map((query) => (
            <Card key={query.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{query.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {query.description || "Sem descrição"}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadQueryIntoEditor(query)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Carregar no Editor
                    </Button>
                    
                    {can('saved_queries:delete') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Dataset</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o dataset "{query.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteQuery(query.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(query.created_at)}
                  </div>
                  
                  {query.connection && (
                    <Badge variant="outline" className="text-xs">
                      {query.connection.name}
                    </Badge>
                  )}
                  
                  {Object.keys(query.parameters || {}).length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(query.parameters).length} parâmetros
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted/50 rounded p-3">
                  <code className="text-xs text-muted-foreground font-mono break-all line-clamp-2">
                    {query.sql_query}
                  </code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}