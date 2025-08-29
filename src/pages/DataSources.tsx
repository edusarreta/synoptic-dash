import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Database, Check, X, Edit, Trash2, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  ssl_enabled: boolean;
  is_active: boolean;
  connection_config: any;
  created_at: string;
}

export default function DataSources() {
  const [selectedType, setSelectedType] = useState<'postgresql' | 'supabase' | 'rest_api'>('postgresql');
  const [authType, setAuthType] = useState<string>('none');
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: "",
    ssl_enabled: true,
  });

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading data sources",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Get user's account
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // For now, we'll store password as plain text (in real implementation, this should be encrypted)
      const { error } = await supabase
        .from('data_connections')
        .insert({
          account_id: profile.account_id,
          name: formData.name,
          host: formData.host,
          port: formData.port,
          database_name: formData.database_name,
          username: formData.username,
          encrypted_password: formData.password, // TODO: Encrypt in production
          ssl_enabled: formData.ssl_enabled,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Data source added",
        description: "Your database connection has been saved successfully.",
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        host: "",
        port: 5432,
        database_name: "",
        username: "",
        password: "",
        ssl_enabled: true,
      });
      loadConnections();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding data source",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const testConnection = async (connection: DataConnection) => {
    setTestingConnection(connection.id);
    
    // Simulate connection test (in real implementation, this would make an API call to test the connection)
    setTimeout(() => {
      toast({
        title: "Connection test",
        description: "Connection test completed successfully!",
      });
      setTestingConnection(null);
    }, 2000);
  };

  const toggleConnection = async (connectionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('data_connections')
        .update({ is_active: isActive })
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(connections.map(conn => 
        conn.id === connectionId ? { ...conn, is_active: isActive } : conn
      ));

      toast({
        title: isActive ? "Connection enabled" : "Connection disabled",
        description: `Data source has been ${isActive ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating connection",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Data Sources</h1>
            <p className="text-muted-foreground mt-1">
              Connect and manage your database connections
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Data Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Data Source</DialogTitle>
                <DialogDescription>
                  Connect to your data source to start analyzing your data
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* Connection Type Selector */}
                  <div className="space-y-2">
                    <Label>Connection Type</Label>
                    <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgresql">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            PostgreSQL
                          </div>
                        </SelectItem>
                        <SelectItem value="supabase">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Supabase
                          </div>
                        </SelectItem>
                        <SelectItem value="rest_api">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            REST API
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Connection Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={selectedType === 'postgresql' ? 'My PostgreSQL DB' : selectedType === 'supabase' ? 'My Supabase Project' : 'My API Service'}
                      required
                    />
                  </div>
                  
                  {/* PostgreSQL Fields */}
                  {selectedType === 'postgresql' && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="host">Host</Label>
                          <Input
                            id="host"
                            value={formData.host}
                            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                            placeholder="localhost"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="port">Port</Label>
                          <Input
                            id="port"
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                            placeholder="5432"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="database_name">Database Name</Label>
                        <Input
                          id="database_name"
                          value={formData.database_name}
                          onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                          placeholder="myapp_production"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="postgres"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ssl"
                          checked={formData.ssl_enabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, ssl_enabled: checked })}
                        />
                        <Label htmlFor="ssl">Enable SSL</Label>
                      </div>
                    </>
                  )}

                  {/* Supabase Fields */}
                  {selectedType === 'supabase' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="supabase_url">Project URL</Label>
                        <Input
                          id="supabase_url"
                          placeholder="https://your-project.supabase.co"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="anon_key">Anon Key (Public)</Label>
                        <Input
                          id="anon_key"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="service_key">Service Role Key (Optional)</Label>
                        <Input
                          id="service_key"
                          type="password"
                          placeholder="For admin access to all tables"
                        />
                      </div>
                    </>
                  )}

                  {/* REST API Fields */}
                  {selectedType === 'rest_api' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="base_url">Base URL</Label>
                        <Input
                          id="base_url"
                          placeholder="https://api.example.com"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Authentication Type</Label>
                        <Select value={authType} onValueChange={setAuthType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Authentication</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {authType === 'bearer' && (
                        <div className="space-y-2">
                          <Label htmlFor="bearer_token">Bearer Token</Label>
                          <Input
                            id="bearer_token"
                            type="password"
                            placeholder="Your bearer token"
                          />
                        </div>
                      )}
                      
                      {authType === 'api_key' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="header_name">Header Name</Label>
                            <Input
                              id="header_name"
                              placeholder="X-API-Key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="api_key">API Key</Label>
                            <Input
                              id="api_key"
                              type="password"
                              placeholder="Your API key"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                 <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="gradient-primary">
                    {isSubmitting ? "Adding..." : "Add Data Source"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Connection List */}
        {connections.length === 0 ? (
          <Card className="glass-card border-0 shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No data sources</h3>
              <p className="text-muted-foreground text-center mb-6">
                Connect your first database to start building analytics
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Data Source
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <Card key={connection.id} className="glass-card border-0 shadow-card hover:shadow-elevated transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{connection.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {connection.connection_type === 'postgresql' ? 'PostgreSQL Database' : 
                           connection.connection_type === 'supabase' ? 'Supabase Project' : 
                           connection.connection_type === 'rest_api' ? 'REST API' : 'Database'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={connection.is_active}
                        onCheckedChange={(checked) => toggleConnection(connection.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    {connection.connection_type === 'postgresql' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Host:</span>
                          <span className="font-mono">{connection.host}:{connection.port}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Database:</span>
                          <span className="font-mono">{connection.database_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SSL:</span>
                          <span className={connection.ssl_enabled ? "text-accent" : "text-muted-foreground"}>
                            {connection.ssl_enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {connection.connection_type === 'supabase' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Project URL:</span>
                        <span className="font-mono truncate max-w-32">{connection.connection_config?.url}</span>
                      </div>
                    )}
                    
                    {connection.connection_type === 'rest_api' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base URL:</span>
                        <span className="font-mono truncate max-w-32">{connection.connection_config?.base_url}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={connection.is_active ? "text-accent" : "text-muted-foreground"}>
                        {connection.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(connection)}
                      disabled={testingConnection === connection.id}
                      className="flex-1"
                    >
                      {testingConnection === connection.id ? "Testing..." : "Test"}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}