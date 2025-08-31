import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Plus, TestTube, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeConnectionType, getDisplayName } from "@/modules/connections/utils/normalizeConnectionType";

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
}

interface NewConnection {
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl_mode: 'require' | 'disable';
}

export default function Connections() {
  const { userProfile } = useSession();
  const { toast } = useToast();
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newConnection, setNewConnection] = useState<NewConnection>({
    name: '',
    type: 'postgres',
    host: '',
    port: 5432,
    database: '',
    user: '',
    password: '',
    ssl_mode: 'require'
  });

  useEffect(() => {
    loadConnections();
  }, []);

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

  const testConnection = async (connectionData?: NewConnection) => {
    if (!userProfile?.org_id) return;

    const testData = connectionData || newConnection;
    if (!testData.host || !testData.database || !testData.user || !testData.password) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setTesting(connectionData ? 'existing' : 'new');

    try {
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          org_id: userProfile.org_id,
          type: testData.type,
          host: testData.host,
          port: testData.port,
          database: testData.database,
          user: testData.user,
          password: testData.password,
          ssl_mode: testData.ssl_mode
        }
      });

      if (error) {
        console.error('Test connection error:', error);
        toast({
          title: "Erro no teste",
          description: "Falha ao testar conexão",
          variant: "destructive",
        });
        return;
      }

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

    if (!newConnection.name || !newConnection.host || !newConnection.database || !newConnection.user || !newConnection.password) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-connection', {
        body: {
          org_id: userProfile.org_id,
          name: newConnection.name,
          type: newConnection.type,
          host: newConnection.host,
          port: newConnection.port,
          database: newConnection.database,
          user: newConnection.user,
          password: newConnection.password,
          ssl_mode: newConnection.ssl_mode
        }
      });

      if (error) {
        console.error('Create connection error:', error);
        toast({
          title: "Erro",
          description: "Falha ao criar conexão",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "✅ Conexão criada",
          description: "Conexão criada com sucesso",
        });

        setShowCreateDialog(false);
        setNewConnection({
          name: '',
          type: 'postgres',
          host: '',
          port: 5432,
          database: '',
          user: '',
          password: '',
          ssl_mode: 'require'
        });
        loadConnections();
      } else {
        toast({
          title: "❌ Falha ao criar",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Create connection error:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar conexão",
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <h1 className="text-3xl font-bold">Conexões de Dados</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie suas conexões com bancos de dados
              </p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Conexão</DialogTitle>
                <DialogDescription>
                  Configure uma nova conexão com seu banco de dados
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conexão</Label>
                    <Input
                      id="name"
                      value={newConnection.name}
                      onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                      placeholder="Meu PostgreSQL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={newConnection.type} onValueChange={(value) => setNewConnection({...newConnection, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                        <SelectItem value="supabase">Supabase (PostgreSQL)</SelectItem>
                        <SelectItem value="mysql" disabled>MySQL (em breve)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      value={newConnection.host}
                      onChange={(e) => setNewConnection({...newConnection, host: e.target.value})}
                      placeholder="localhost ou seu-host.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Porta</Label>
                    <Input
                      id="port"
                      type="number"
                      value={newConnection.port}
                      onChange={(e) => setNewConnection({...newConnection, port: parseInt(e.target.value) || 5432})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="database">Banco de Dados</Label>
                    <Input
                      id="database"
                      value={newConnection.database}
                      onChange={(e) => setNewConnection({...newConnection, database: e.target.value})}
                      placeholder="postgres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssl_mode">Modo SSL</Label>
                    <Select value={newConnection.ssl_mode} onValueChange={(value: 'require' | 'disable') => setNewConnection({...newConnection, ssl_mode: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="require">Requerido (recomendado)</SelectItem>
                        <SelectItem value="disable">Desabilitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Usuário</Label>
                    <Input
                      id="user"
                      value={newConnection.user}
                      onChange={(e) => setNewConnection({...newConnection, user: e.target.value})}
                      placeholder="postgres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newConnection.password}
                      onChange={(e) => setNewConnection({...newConnection, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => testConnection()}
                    disabled={testing === 'new'}
                  >
                    {testing === 'new' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                  <Button onClick={createConnection} disabled={creating}>
                    {creating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    Criar Conexão
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma conexão configurada</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie sua primeira conexão com banco de dados para começar a trabalhar com seus dados
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Conexão
                </Button>
              </CardContent>
            </Card>
          ) : (
            connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{connection.name}</CardTitle>
                        <CardDescription>
                          {getDisplayName(normalizeConnectionType(connection.connection_type as any))} • {connection.host}:{connection.port}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connection.is_active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativa
                        </Badge>
                      )}
                      {connection.ssl_enabled && (
                        <Badge variant="outline">SSL</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Banco</p>
                        <p className="text-muted-foreground">{connection.database_name}</p>
                      </div>
                      <div>
                        <p className="font-medium">Usuário</p>
                        <p className="text-muted-foreground">{connection.username}</p>
                      </div>
                      <div>
                        <p className="font-medium">Criado em</p>
                        <p className="text-muted-foreground">
                          {new Date(connection.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Conexão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a conexão "{connection.name}"? 
                              Esta ação não pode ser desfeita e pode afetar dashboards e consultas que utilizam esta conexão.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteConnection(connection.id)} className="bg-destructive hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}