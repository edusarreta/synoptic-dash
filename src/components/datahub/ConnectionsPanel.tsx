import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Plus, TestTube, Trash2, Loader2, CheckCircle, XCircle, Globe, Server } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getTypeLabel } from "@/modules/connections/utils/normalizeConnectionType";
import { useDataHubStore } from "@/hooks/useDataHubStore";

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_enabled: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  connection_config?: any;
}

interface ConnectionFormData {
  name: string;
  rawType: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_mode: 'require' | 'disable';
  base_url: string;
  auth_type: 'none' | 'bearer' | 'header';
  auth_token: string;
  headers_json: string;
  test_path: string;
}

const defaultFormValues: ConnectionFormData = {
  name: '',
  rawType: 'postgres',
  host: '',
  port: 5432,
  database: '',
  user: '',
  password: '',
  ssl_mode: 'require',
  base_url: '',
  auth_type: 'none',
  auth_token: '',
  headers_json: '{}',
  test_path: '/api/test'
};

export function ConnectionsPanel() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  const { setSelectedConnection } = useDataHubStore();
  
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const form = useForm<ConnectionFormData>({
    defaultValues: defaultFormValues
  });
  
  const watchedRawType = form.watch('rawType');
  const selectedConnection = connections.find(c => c.id === selectedConnectionId);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      const formData = mapRecordToForm(selectedConnection);
      form.reset(formData);
    } else {
      form.reset(defaultFormValues);
    }
  }, [selectedConnection?.id, form]);

  const mapRecordToForm = (connection: DataConnection): ConnectionFormData => {
    const config = connection.connection_config || {};
    return {
      name: connection.name,
      rawType: connection.connection_type,
      host: connection.host || '',
      port: connection.port || 5432,
      database: connection.database_name || '',
      user: connection.username || '',
      password: '',
      ssl_mode: connection.ssl_enabled ? 'require' : 'disable',
      base_url: config.base_url || '',
      auth_type: config.auth_type || 'none',
      auth_token: '',
      headers_json: JSON.stringify(config.headers || {}, null, 2),
      test_path: config.test_path || '/api/test'
    };
  };

  const loadConnections = async () => {
    if (!userProfile?.org_id) return;

    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('account_id', userProfile.org_id)
        .order('created_at', { ascending: false });

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
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conexões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!userProfile?.org_id) return;

    const formData = form.getValues();
    const isRest = formData.rawType === 'rest';

    if (isRest) {
      if (!formData.base_url || !formData.test_path) {
        toast({
          title: "Dados incompletos",
          description: "Preencha URL base e caminho de teste",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.host || !formData.database || !formData.user || !formData.password) {
        toast({
          title: "Dados incompletos",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }
    }

    setTesting('testing');

    try {
      if (isRest) {
        const { data, error } = await supabase.functions.invoke('test-rest-connection', {
          body: {
            org_id: userProfile.org_id,
            base_url: formData.base_url,
            auth_type: formData.auth_type,
            auth_token: formData.auth_token || undefined,
            headers_json: formData.headers_json || '{}',
            test_path: formData.test_path
          }
        });

        if (error) throw error;

        if (data?.ok) {
          toast({
            title: "✅ Conexão REST bem-sucedida",
            description: `Resposta: ${data.contentType}, ${data.sampleLen} chars`,
          });
        } else {
          toast({
            title: "❌ Falha na conexão REST",
            description: data?.message || "Erro desconhecido",
            variant: "destructive",
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke('test-database-connection', {
          body: {
            org_id: userProfile.org_id,
            type: formData.rawType,
            host: formData.host,
            port: formData.port,
            database: formData.database,
            user: formData.user,
            password: formData.password,
            ssl_mode: formData.ssl_mode
          }
        });

        if (error) throw error;

        if (data?.ok) {
          toast({
            title: "✅ Conexão bem-sucedida",
            description: `Conectado ao ${data.server}`,
          });
        } else {
          toast({
            title: "❌ Falha na conexão",
            description: data?.message || "Erro desconhecido",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast({
        title: "Erro no teste",
        description: "Falha ao testar conexão",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const createConnection = async () => {
    if (!userProfile?.org_id) return;

    const formData = form.getValues();
    const isRest = formData.rawType === 'rest';

    if (isRest) {
      if (!formData.name || !formData.base_url) {
        toast({
          title: "Dados incompletos",
          description: "Preencha nome e URL base",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.name || !formData.host || !formData.database || !formData.user || !formData.password) {
        toast({
          title: "Dados incompletos",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-connection', {
        body: {
          org_id: userProfile.org_id,
          name: formData.name,
          type: formData.rawType,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          user: formData.user,
          password: formData.password,
          ssl_mode: formData.ssl_mode,
          base_url: formData.base_url,
          auth_type: formData.auth_type,
          auth_token: formData.auth_token,
          headers_json: formData.headers_json,
          test_path: formData.test_path
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "✅ Conexão criada",
          description: data?.message || "Conexão criada com sucesso",
        });

        setShowCreateDialog(false);
        setSelectedConnectionId(null);
        form.reset(defaultFormValues);
        loadConnections();
      } else {
        throw new Error(data?.message || "Falha ao criar conexão");
      }
    } catch (error: any) {
      console.error('Create connection error:', error);
      toast({
        title: "❌ Erro",
        description: error.message || "Falha ao criar conexão",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', connectionId)
        .eq('account_id', userProfile?.org_id);

      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao excluir conexão",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conexão excluída",
        description: "Conexão removida com sucesso",
      });
      
      setSelectedConnectionId(null);
      loadConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir conexão",
        variant: "destructive",
      });
    }
  };

  const canCreateConnections = can('connections:create');
  const isRest = watchedRawType === 'rest';
  const typeLabel = getTypeLabel(watchedRawType);

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
          <h2 className="text-2xl font-bold">Conexões de Dados</h2>
          <p className="text-muted-foreground">
            Gerencie suas conexões com bancos de dados e APIs
          </p>
        </div>

        {canCreateConnections && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Conexão - {typeLabel}</DialogTitle>
                <DialogDescription>
                  Configure uma nova conexão com sua fonte de dados
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conexão</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="Minha Fonte de Dados"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rawType">Tipo</Label>
                    <Select value={watchedRawType} onValueChange={(value) => form.setValue('rawType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgres">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            PostgreSQL
                          </div>
                        </SelectItem>
                        <SelectItem value="postgresql">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Supabase (PostgreSQL)
                          </div>
                        </SelectItem>
                        <SelectItem value="rest">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            REST API (beta)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Connection form fields based on type */}
                {!isRest ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          {...form.register('host')}
                          placeholder="localhost"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Porta</Label>
                        <Input
                          id="port"
                          type="number"
                          {...form.register('port', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="database">Database</Label>
                        <Input
                          id="database"
                          {...form.register('database')}
                          placeholder="my_database"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user">Usuário</Label>
                        <Input
                          id="user"
                          {...form.register('user')}
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        {...form.register('password')}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_url">URL Base da API</Label>
                      <Input
                        id="base_url"
                        {...form.register('base_url')}
                        placeholder="https://api.exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="test_path">Caminho de Teste</Label>
                      <Input
                        id="test_path"
                        {...form.register('test_path')}
                        placeholder="/api/test"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={testing === 'testing'}
                  >
                    {testing === 'testing' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                  <Button
                    onClick={createConnection}
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Criar Conexão
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Database className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma conexão configurada</p>
            {canCreateConnections && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar primeira conexão
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card 
              key={connection.id}
              className={`cursor-pointer transition-colors ${
                selectedConnectionId === connection.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
              }`}
              onClick={() => {
                setSelectedConnectionId(connection.id);
                setSelectedConnection(connection.id);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {connection.connection_type === 'rest' ? (
                        <Globe className="w-5 h-5 text-primary" />
                      ) : (
                        <Database className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{connection.name}</CardTitle>
                      <CardDescription>
                        {getTypeLabel(connection.connection_type)}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={connection.is_active ? "default" : "secondary"}>
                      {connection.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativa
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativa
                        </>
                      )}
                    </Badge>
                    
                    {can('connections:delete') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Conexão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a conexão "{connection.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteConnection(connection.id)}
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
              
              {connection.connection_type !== 'rest' && (
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">
                      {connection.host}:{connection.port}/{connection.database_name}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}