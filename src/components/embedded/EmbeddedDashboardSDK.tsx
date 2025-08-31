import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Settings, Code, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmbeddedConfig {
  id: string;
  dashboard_id: string;
  public_token: string;
  allowed_domains: string[];
  filter_config: any;
  is_active: boolean;
}

interface EmbeddedDashboardSDKProps {
  dashboardId: string;
  dashboardName: string;
}

export function EmbeddedDashboardSDK({ dashboardId, dashboardName }: EmbeddedDashboardSDKProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<EmbeddedConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<string>('');
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [dashboardId]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('embedded_analytics')
          .select('*')
          .eq('dashboard_id', dashboardId)
          .eq('account_id', profile.org_id)
          .single();

        setConfig(data);
        if (data?.allowed_domains) {
          setDomains(data.allowed_domains.join('\n'));
        }
      }
    } catch (error) {
      console.error('Error loading embedded config:', error);
    }
  };

  const createConfig = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data, error } = await supabase
          .from('embedded_analytics')
          .insert({
            dashboard_id: dashboardId,
            account_id: profile.org_id,
            created_by: user.id,
            allowed_domains: domains.split('\n').filter(d => d.trim()),
          })
          .select()
          .single();

        if (error) throw error;

        setConfig(data);
        toast({
          title: "Embedding Created",
          description: "Dashboard embedding configuration created successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    if (!config) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('embedded_analytics')
        .update({
          allowed_domains: domains.split('\n').filter(d => d.trim()),
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Configuration Updated",
        description: "Embedding configuration updated successfully.",
      });
      loadConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async () => {
    if (!config) return;

    try {
      const { error } = await supabase
        .from('embedded_analytics')
        .update({ is_active: !config.is_active })
        .eq('id', config.id);

      if (error) throw error;

      setConfig({ ...config, is_active: !config.is_active });
      toast({
        title: config.is_active ? "Embedding Disabled" : "Embedding Enabled",
        description: `Dashboard embedding has been ${config.is_active ? 'disabled' : 'enabled'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard.",
    });
  };

  const getEmbedCode = () => {
    if (!config) return '';

    return `<!-- SynopticBI Embedded Dashboard -->
<div id="synoptic-dashboard-${dashboardId}"></div>
<script src="https://cdn.synopticbi.com/embed.js"></script>
<script>
  SynopticBI.embed({
    containerId: 'synoptic-dashboard-${dashboardId}',
    token: '${config.public_token}',
    dashboardId: '${dashboardId}',
    filters: {
      // Add your custom filters here
      // Example: { userId: 'current-user-id' }
    },
    width: '100%',
    height: '600px'
  });
</script>`;
  };

  const getReactCode = () => {
    if (!config) return '';

    return `import { SynopticDashboard } from '@synopticbi/react-embed';

function MyComponent() {
  return (
    <SynopticDashboard
      token="${config.public_token}"
      dashboardId="${dashboardId}"
      filters={{
        // Add your custom filters here
        // Example: { userId: 'current-user-id' }
      }}
      width="100%"
      height="600px"
    />
  );
}`;
  };

  return (
    <Card className="glass-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Embedded Analytics - {dashboardName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!config ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Enable Dashboard Embedding</h3>
            <p className="text-muted-foreground mb-4">
              Share this dashboard securely in your applications
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="domains">Allowed Domains (one per line)</Label>
                <textarea
                  id="domains"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="https://myapp.com&#10;https://staging.myapp.com"
                />
              </div>
              <Button onClick={createConfig} disabled={loading} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Create Embedding Configuration
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={config.is_active ? "default" : "secondary"}>
                  {config.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Public Token: {config.public_token.substring(0, 8)}...
                </span>
              </div>
              <Switch
                checked={config.is_active}
                onCheckedChange={toggleActive}
              />
            </div>

            <Separator />

            {/* Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="domains-update">Allowed Domains</Label>
                <textarea
                  id="domains-update"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="https://myapp.com&#10;https://staging.myapp.com"
                />
              </div>
              <Button onClick={updateConfig} disabled={loading} variant="outline">
                Update Configuration
              </Button>
            </div>

            <Separator />

            {/* Embed Code */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Integration Code</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCode(!showCode)}
                >
                  <Code className="w-4 h-4 mr-2" />
                  {showCode ? 'Hide Code' : 'Show Code'}
                </Button>
              </div>

              {showCode && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>HTML/JavaScript</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(getEmbedCode())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{getEmbedCode()}</code>
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>React Component</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(getReactCode())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{getReactCode()}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview URL</Label>
              <div className="flex gap-2">
                <Input
                  value={`https://embed.synopticbi.com/dashboard/${config.public_token}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(`https://embed.synopticbi.com/dashboard/${config.public_token}`, '_blank')}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`https://embed.synopticbi.com/dashboard/${config.public_token}`)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}