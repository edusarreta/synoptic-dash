import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";  
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Database, Eye, Calendar, User, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RequirePermission } from "@/components/auth/RequirePermission";

interface Dataset {
  id: string;
  name: string;
  description?: string;
  cache_ttl_seconds: number;
  data_schema: any;
  last_updated?: string;
  created_at: string;
  created_by: string;
  profiles?: any;
}

interface DatasetPreview {
  columns: string[];
  rows: any[][];
  total_rows?: number;
}

export default function Datasets() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, [userProfile?.org_id]);

  const loadDatasets = async () => {
    if (!userProfile?.org_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('datasets')
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
      setDatasets(data || []);
    } catch (error: any) {
      console.error('Error loading datasets:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar datasets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const previewDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsLoadingPreview(true);
    setPreviewData(null);

    try {
      // For now, create a mock preview since datasets-preview function doesn't exist yet
      setPreviewData({
        columns: dataset.data_schema?.columns || ['id', 'name', 'value'],
        rows: [
          ['1', 'Sample Data', '100'],
          ['2', 'Test Record', '200'],
          ['3', 'Example Row', '300']
        ]
      });
    } catch (error: any) {
      console.error('Error loading dataset preview:', error);
      toast({
        title: "Erro", 
        description: "Falha ao carregar preview do dataset",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
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

  const formatCacheTTL = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <RequirePermission perms={["datasets:read"]}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Datasets</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie seus datasets salvos
            </p>
          </div>
          
          <Button onClick={loadDatasets} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : datasets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Database className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum dataset encontrado</h3>
              <p className="text-muted-foreground text-center">
                Use o Editor SQL para criar seus primeiros datasets
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Datasets Disponíveis</CardTitle>
              <CardDescription>
                {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} encontrado{datasets.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Linhas</TableHead>
                    <TableHead>Cache TTL</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell className="font-medium">
                        {dataset.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {dataset.description || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dataset.data_schema?.row_count?.toLocaleString('pt-BR') || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatCacheTTL(dataset.cache_ttl_seconds)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span className="text-sm">
                            {dataset.profiles?.full_name || dataset.profiles?.email || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(dataset.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => previewDataset(dataset)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                            <DialogHeader>
                              <DialogTitle>Preview: {selectedDataset?.name}</DialogTitle>
                              <DialogDescription>
                                {selectedDataset?.description}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="flex-1 overflow-auto">
                              {isLoadingPreview ? (
                                <div className="flex items-center justify-center h-32">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                              ) : previewData ? (
                                <div className="space-y-4">
                                  <div className="text-sm text-muted-foreground">
                                    {previewData.rows.length} linhas • {previewData.columns.length} colunas
                                  </div>
                                  
                                  <div className="overflow-auto max-h-96">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          {previewData.columns.map((col, index) => (
                                            <TableHead key={index} className="font-mono text-xs">
                                              {col}
                                            </TableHead>
                                          ))}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {previewData.rows.map((row, rowIndex) => (
                                          <TableRow key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                              <TableCell key={cellIndex} className="text-xs max-w-32 truncate">
                                                {cell !== null ? String(cell) : 
                                                  <span className="text-muted-foreground italic">null</span>
                                                }
                                              </TableCell>
                                            ))}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  Falha ao carregar preview
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
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