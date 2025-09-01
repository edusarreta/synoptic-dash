import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Database, Plus, TestTube, CheckCircle, XCircle, AlertCircle, Trash2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/providers/SessionProvider';
import { getTypeLabel, getConnectionHelpText } from '../utils/normalizeConnectionType';

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  host: string;
  database_name: string;
  username: string;
  port: number;
  is_active: boolean;
  created_at: string;
}

export function ConnectionsPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userProfile } = useSession();

  const [newConnection, setNewConnection] = useState({
    name: '',
    connection_type: 'postgresql',
    host: '',
    database_name: '',
    username: '',
    password: '',
    port: 5432,
    ssl_mode: 'require',
    // Supabase API specific fields
    supabase_url: '',
    supabase_key: '',
    schema_default: 'public',
    // REST API specific fields
    base_url: '',
    auth_type: 'none',
    auth_token: '',
    headers_json: '{}',
    test_path: '',
  });

  const [editingConnection, setEditingConnection] = useState<DataConnection | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [testConnectionResult, setTestConnectionResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conexões de dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const handleCreateConnection = async () => {
    if (!userProfile?.org_id || !user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não está associado a uma organização",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-connection', {
        body: {
          org_id: userProfile.org_id,
          name: newConnection.name,
          type: newConnection.connection_type,
          host: newConnection.host,
          port: newConnection.port,
          database: newConnection.database_name,
          user: newConnection.username,
          password: newConnection.password,
          ssl_mode: newConnection.ssl_mode,
        }
      });

      if (error) throw error;

      if (data?.success) {

        toast({
          title: "Sucesso",
          description: data?.message || "Conexão criada com sucesso",
        });
      } else {
        toast({
          title: "Erro",
          description: data?.message || "Falha ao criar conexão",
          variant: "destructive",
        });
        return;
      }

      setIsDialogOpen(false);
      setNewConnection({
        name: '',
        connection_type: 'postgresql',
        host: '',
        database_name: '',
        username: '',
        password: '',
        port: 5432,
        ssl_mode: 'require',
        supabase_url: '',
        supabase_key: '',
        schema_default: 'public',
        base_url: '',
        auth_type: 'none',
        auth_token: '',
        headers_json: '{}',
        test_path: '',
      });
      fetchConnections();
    } catch (error) {
      console.error('Erro ao criar conexão:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar conexão",
        variant: "destructive",
      });
    }
  };

  const handleTestNewConnection = async () => {
    if (!userProfile?.org_id) {
      toast({
        title: "Erro",
        description: "Usuário não está associado a uma organização",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection('new');
    setTestConnectionResult({ status: null, message: '' });

    try {
      let functionName = 'test-database-connection';
      let requestBody: any = {
        org_id: userProfile.org_id,
        type: newConnection.connection_type,
      };

      // For REST API connections, use different endpoint and params
      if (newConnection.connection_type === 'rest_api') {
        functionName = 'test-rest-connection';
        requestBody = {
          org_id: userProfile.org_id,
          base_url: newConnection.base_url,
          auth_type: newConnection.auth_type,
          auth_token: newConnection.auth_token,
          headers: newConnection.headers_json ? JSON.parse(newConnection.headers_json) : {},
          test_path: newConnection.test_path || '/'
        };
      } else {
        // Database connection params
        requestBody = {
          ...requestBody,
          host: newConnection.host,
          port: newConnection.port,
          database: newConnection.database_name,
          user: newConnection.username,
          password: newConnection.password,
          ssl_mode: newConnection.ssl_mode,
        };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) throw error;

      setTestConnectionResult({
        status: data.ok || data.success ? 'success' : 'error',
        message: data.ok || data.success
          ? `Conexão bem-sucedida! ${data.server_version ? `(${data.server_version})` : ''}${data.status_code ? ` Status: ${data.status_code}` : ''}` 
          : data.error_message || data.message || 'Falha na conexão'
      });

      toast({
        title: data.ok || data.success ? "Sucesso" : "Erro",
        description: data.ok || data.success
          ? `Conexão testada com sucesso! ${data.server_version ? `Versão: ${data.server_version}` : ''}${data.status_code ? ` Status: ${data.status_code}` : ''}` 
          : data.error_message || data.message || 'Falha ao testar conexão',
        variant: data.ok || data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      const errorMessage = error.message || 'Falha ao testar conexão';
      
      setTestConnectionResult({
        status: 'error',
        message: errorMessage
      });

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(null);
    }
  };

  const testConnection = async (connectionId: string) => {
    setIsTestingConnection(connectionId);
    try {
      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: { connection_id: connectionId }
      });

      if (error) throw error;

      toast({
        title: data.success ? "Sucesso" : "Erro",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast({
        title: "Erro",
        description: "Falha ao testar conexão",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(null);
    }
  };

  const handleEditConnection = (connection: DataConnection) => {
    setEditingConnection(connection);
    setNewConnection({
      name: connection.name,
      connection_type: connection.connection_type,
      host: connection.host,
      database_name: connection.database_name,
      username: connection.username,
      password: '', // Don't populate password for security
      port: connection.port,
      ssl_mode: 'require', // Default since we don't store this separately
      supabase_url: '',
      supabase_key: '',
      schema_default: 'public',
      base_url: '',
      auth_type: 'none',
      auth_token: '',
      headers_json: '{}',
      test_path: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateConnection = async () => {
    if (!userProfile?.org_id || !user?.id || !editingConnection) {
      toast({
        title: "Erro",
        description: "Dados inválidos para atualização",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-connection', {
        body: {
          org_id: userProfile.org_id,
          name: newConnection.name,
          type: newConnection.connection_type,
          host: newConnection.host,
          port: newConnection.port,
          database: newConnection.database_name,
          user: newConnection.username,
          password: newConnection.password || 'unchanged', // Use special value if password not changed
          ssl_mode: newConnection.ssl_mode,
          update_id: editingConnection.id, // Special parameter for update
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: data?.message || "Conexão atualizada com sucesso",
        });

        setIsEditDialogOpen(false);
        setEditingConnection(null);
        setNewConnection({
          name: '',
          connection_type: 'postgresql',
          host: '',
          database_name: '',
          username: '',
          password: '',
          port: 5432,
          ssl_mode: 'require',
          supabase_url: '',
          supabase_key: '',
          schema_default: 'public',
          base_url: '',
          auth_type: 'none',
          auth_token: '',
          headers_json: '{}',
          test_path: '',
        });
        fetchConnections();
      } else {
        toast({
          title: "Erro",
          description: data?.message || "Falha ao atualizar conexão",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar conexão:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar conexão",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!userProfile?.org_id) {
      toast({
        title: "Erro",
        description: "Usuário não está associado a uma organização",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-connection', {
        body: {
          org_id: userProfile.org_id,
          connection_id: connectionId,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: data.message || "Conexão excluída com sucesso",
        });
        fetchConnections();
      } else {
        toast({
          title: "Erro",
          description: data?.message || "Falha ao excluir conexão",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir conexão:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir conexão",
        variant: "destructive",
      });
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
      case 'supabase':
        return <Database className="w-5 h-5 text-blue-600" />;
      case 'mysql':
        return <Database className="w-5 h-5 text-orange-600" />;
      case 'mongodb':
        return <Database className="w-5 h-5 text-green-600" />;
      default:
        return <Database className="w-5 h-5 text-gray-600" />;
    }
  };

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'postgresql':
      case 'supabase':
        return 'bg-blue-100';
      case 'mysql':
        return 'bg-orange-100';
      case 'mongodb':
        return 'bg-green-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando conexões...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conexões de Dados</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com bancos de dados e APIs
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Conexão de Dados</DialogTitle>
              <DialogDescription>
                Configure uma nova conexão com banco de dados
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Conexão</Label>
                <Input
                  id="name"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                  placeholder="Ex: Banco Principal"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo de Conexão</Label>
                <Select 
                  value={newConnection.connection_type} 
                  onValueChange={(value) => setNewConnection({...newConnection, connection_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="postgresql">PostgreSQL</SelectItem>
                     <SelectItem value="mysql">MySQL</SelectItem>
                     <SelectItem value="supabase_api">Supabase (API)</SelectItem>
                     <SelectItem value="rest">REST API genérica</SelectItem>
                   </SelectContent>
                </Select>
                
                {/* Help text for connection type */}
                {getConnectionHelpText(newConnection.connection_type) && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      {getConnectionHelpText(newConnection.connection_type)}
                    </p>
                  </div>
                )}
              </div>

              {/* Database connection fields */}
              {['postgresql', 'supabase_postgres', 'mysql'].includes(newConnection.connection_type) && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      value={newConnection.host}
                      onChange={(e) => setNewConnection({...newConnection, host: e.target.value})}
                      placeholder="localhost ou IP do servidor"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="port">Porta</Label>
                      <Input
                        id="port"
                        type="number"
                        value={newConnection.port}
                        onChange={(e) => setNewConnection({...newConnection, port: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="database">Banco</Label>
                      <Input
                        id="database"
                        value={newConnection.database_name}
                        onChange={(e) => setNewConnection({...newConnection, database_name: e.target.value})}
                        placeholder="Nome do banco"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      value={newConnection.username}
                      onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                      placeholder="Nome do usuário"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newConnection.password}
                      onChange={(e) => setNewConnection({...newConnection, password: e.target.value})}
                      placeholder="Senha do banco"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ssl_mode">Modo SSL</Label>
                    <Select 
                      value={newConnection.ssl_mode} 
                      onValueChange={(value) => setNewConnection({...newConnection, ssl_mode: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="require">Require (Recomendado)</SelectItem>
                        <SelectItem value="disable">Disable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* REST API connection fields */}
              {newConnection.connection_type === 'rest_api' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="base_url">URL Base da API</Label>
                    <Input
                      id="base_url"
                      value={newConnection.base_url}
                      onChange={(e) => setNewConnection({...newConnection, base_url: e.target.value})}
                      placeholder="https://api.exemplo.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="auth_type">Tipo de Autenticação</Label>
                    <Select 
                      value={newConnection.auth_type} 
                      onValueChange={(value) => setNewConnection({...newConnection, auth_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anon">Anon (Supabase)</SelectItem>
                        <SelectItem value="service">Service Role (Supabase)</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="header">Custom Header</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="auth_token">Token/Chave de Autenticação</Label>
                    <Input
                      id="auth_token"
                      type="password"
                      value={newConnection.auth_token}
                      onChange={(e) => setNewConnection({...newConnection, auth_token: e.target.value})}
                      placeholder="Token de autenticação"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="test_path">Caminho de Teste</Label>
                    <Input
                      id="test_path"
                      value={newConnection.test_path}
                      onChange={(e) => setNewConnection({...newConnection, test_path: e.target.value})}
                      placeholder="/health ou /api/status"
                    />
                  </div>
                </>
              )}

              {testConnectionResult.status && (
                <div className={`p-3 rounded border flex items-center gap-2 ${
                  testConnectionResult.status === 'success' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {testConnectionResult.status === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{testConnectionResult.message}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTestNewConnection}
                disabled={isTestingConnection === 'new'}
              >
                {isTestingConnection === 'new' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                ) : (
                  <TestTube className="w-4 h-4 mr-1" />
                )}
                Testar Conexão
              </Button>
              <Button 
                onClick={handleCreateConnection}
                disabled={testConnectionResult.status !== 'success'}
              >
                Criar Conexão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${getConnectionColor(connection.connection_type)} rounded-lg flex items-center justify-center`}>
                  {getConnectionIcon(connection.connection_type)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{connection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    {connection.is_active ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-red-500" />
                        Desconectado
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Host:</div>
                <div className="font-mono">{connection.host}:{connection.port}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Database:</div>
                <div className="font-mono">{connection.database_name}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Usuário:</div>
                <div className="font-mono">{connection.username}</div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => testConnection(connection.id)}
                  disabled={isTestingConnection === connection.id}
                >
                  {isTestingConnection === connection.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                  ) : (
                    <TestTube className="w-4 h-4 mr-1" />
                  )}
                  Testar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditConnection(connection)}
                >
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a conexão "{connection.name}"? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteConnection(connection.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add new connection card */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center h-48 text-center space-y-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Nova Conexão</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte uma nova fonte de dados
                  </p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
        </Dialog>

        {/* Edit connection dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Conexão</DialogTitle>
              <DialogDescription>
                Atualize os dados da sua conexão de banco de dados.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome da Conexão</Label>
                <Input
                  id="edit-name"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                  placeholder="Minha Conexão"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-type">Tipo de Banco</Label>
                <Select 
                  value={newConnection.connection_type} 
                  onValueChange={(value) => setNewConnection({...newConnection, connection_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="supabase">Supabase (PostgreSQL)</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-host">Host</Label>
                <Input
                  id="edit-host"
                  value={newConnection.host}
                  onChange={(e) => setNewConnection({...newConnection, host: e.target.value})}
                  placeholder="localhost"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-port">Porta</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={newConnection.port}
                    onChange={(e) => setNewConnection({...newConnection, port: parseInt(e.target.value) || 5432})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-database">Banco de Dados</Label>
                  <Input
                    id="edit-database"
                    value={newConnection.database_name}
                    onChange={(e) => setNewConnection({...newConnection, database_name: e.target.value})}
                    placeholder="meu_banco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Usuário</Label>
                  <Input
                    id="edit-username"
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                    placeholder="usuario"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">Senha (deixe vazio para manter atual)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={newConnection.password}
                    onChange={(e) => setNewConnection({...newConnection, password: e.target.value})}
                    placeholder="Deixe vazio para manter senha atual"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-ssl_mode">Modo SSL</Label>
                <Select 
                  value={newConnection.ssl_mode} 
                  onValueChange={(value) => setNewConnection({...newConnection, ssl_mode: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="require">Require (Recomendado)</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateConnection}>
                Atualizar Conexão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}