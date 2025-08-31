import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Database, Plus, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/providers/SessionProvider';

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
  });

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
      const { error } = await supabase
        .from('data_connections')
        .insert([{
          ...newConnection,
          account_id: userProfile.org_id,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conexão criada com sucesso",
      });

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
      const { data, error } = await supabase.functions.invoke('test-database-connection', {
        body: {
          org_id: userProfile.org_id,
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

      setTestConnectionResult({
        status: data.ok ? 'success' : 'error',
        message: data.ok 
          ? `Conexão bem-sucedida! ${data.server_version ? `(${data.server_version})` : ''}` 
          : data.error_message || 'Falha na conexão'
      });

      toast({
        title: data.ok ? "Sucesso" : "Erro",
        description: data.ok 
          ? `Conexão testada com sucesso! ${data.server_version ? `Versão: ${data.server_version}` : ''}` 
          : data.error_message || 'Falha ao testar conexão',
        variant: data.ok ? "default" : "destructive",
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

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
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
                <Label htmlFor="type">Tipo de Banco</Label>
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
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Button size="sm" variant="outline">
                  Editar
                </Button>
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
      </div>
    </div>
  );
}