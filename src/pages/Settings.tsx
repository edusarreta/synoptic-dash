import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Shield, User, Key, Save, Copy, Trash2, Plus } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  id?: string;
  locale: string;
  timezone: string;
  theme: string;
  date_format: string;
  number_format: string;
  default_org_id?: string;
  default_workspace_id?: string;
  email_opt_in: boolean;
}

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

export default function Settings() {
  const { userProfile } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    theme: 'system',
    date_format: 'dd/MM/yyyy',
    number_format: 'pt-BR',
    email_opt_in: true
  });

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadTokens();
  }, []);

  const loadSettings = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userProfile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          locale: data.locale || 'pt-BR',
          timezone: data.timezone || 'America/Sao_Paulo',
          theme: data.theme || 'system',
          date_format: data.date_format || 'dd/MM/yyyy',
          number_format: data.number_format || 'pt-BR',
          default_org_id: data.default_org_id,
          default_workspace_id: data.default_workspace_id,
          email_opt_in: data.email_opt_in ?? true
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('id, name, created_at, last_used_at')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tokens:', error);
        return;
      }

      setTokens(data || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const saveSettings = async () => {
    if (!userProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          id: userProfile.id,
          ...settings
        });

      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao salvar configurações",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createToken = async () => {
    if (!userProfile || !newTokenName.trim()) return;

    try {
      // Generate a random token
      const tokenValue = `st_${btoa(Math.random().toString()).slice(0, 40)}`;
      const tokenHash = btoa(tokenValue); // Simple hash for demo

      const { error } = await supabase
        .from('api_tokens')
        .insert({
          user_id: userProfile.id,
          name: newTokenName.trim(),
          token_hash: tokenHash
        });

      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao criar token",
          variant: "destructive",
        });
        return;
      }

      setNewToken(tokenValue);
      setNewTokenName('');
      loadTokens();

      toast({
        title: "Token criado",
        description: "Copie o token agora, ele não será mostrado novamente",
      });
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar token",
        variant: "destructive",
      });
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .delete()
        .eq('id', tokenId)
        .eq('user_id', userProfile?.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao revogar token",
          variant: "destructive",
        });
        return;
      }

      loadTokens();
      toast({
        title: "Token revogado",
        description: "Token removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: "Erro",
        description: "Falha ao revogar token",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Token copiado para a área de transferência",
    });
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
        <div className="flex items-center gap-4">
          <BackLink />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie suas preferências e configurações da conta
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings2 className="w-4 h-4 mr-2" />
              Preferências
            </TabsTrigger>
            <TabsTrigger value="tokens">
              <Key className="w-4 h-4 mr-2" />
              Tokens de API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Suas informações básicas de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input value={userProfile?.email || ''} disabled />
                  </div>
                  <div>
                    <Label>Nome Completo</Label>
                    <Input value={userProfile?.full_name || ''} disabled />
                  </div>
                  <div>
                    <Label>Função</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{userProfile?.role}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Organização</Label>
                    <Input value={userProfile?.org_id || ''} disabled className="font-mono text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências do Sistema</CardTitle>
                <CardDescription>
                  Configure suas preferências de localização e aparência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locale">Idioma</Label>
                    <Select value={settings.locale} onValueChange={(value) => setSettings({...settings, locale: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                        <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                        <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo (UTC+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select value={settings.theme} onValueChange={(value) => setSettings({...settings, theme: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Sistema</SelectItem>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_format">Formato de Data</Label>
                    <Select value={settings.date_format} onValueChange={(value) => setSettings({...settings, date_format: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_opt_in">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber emails sobre atualizações e novidades
                    </p>
                  </div>
                  <Switch
                    id="email_opt_in"
                    checked={settings.email_opt_in}
                    onCheckedChange={(checked) => setSettings({...settings, email_opt_in: checked})}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveSettings} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tokens de API</CardTitle>
                <CardDescription>
                  Gerencie seus tokens de acesso à API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {newToken && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Novo Token Criado</Label>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(newToken)}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <Input value={newToken} readOnly className="font-mono text-sm" />
                    <p className="text-sm text-destructive">
                      ⚠️ Copie este token agora! Ele não será mostrado novamente.
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setNewToken(null)}>
                      Fechar
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do token"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                  />
                  <Button onClick={createToken} disabled={!newTokenName.trim()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Criar Token
                  </Button>
                </div>

                <div className="space-y-2">
                  {tokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum token de API criado
                    </p>
                  ) : (
                    tokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{token.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Criado em {new Date(token.created_at).toLocaleDateString('pt-BR')}
                            {token.last_used_at && (
                              <> • Último uso: {new Date(token.last_used_at).toLocaleDateString('pt-BR')}</>
                            )}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteToken(token.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}