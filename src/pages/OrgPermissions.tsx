import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/SessionProvider';
import { usePermissions } from '@/providers/PermissionsProvider';
import { BackLink } from '@/components/BackLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Permission {
  code: string;
  module: string;
  description: string;
}

interface RolePermission {
  role: string;
  perm_code: string;
}

const ROLES = ['MASTER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;

export default function OrgPermissions() {
  const { userProfile } = useSession();
  const { role, refreshPermissions } = usePermissions();
  const { toast } = useToast();
  
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const loadData = async () => {
    if (!userProfile?.org_id) return;

    try {
      setLoading(true);

      // Load all permissions
      const { data: permsData, error: permsError } = await supabase
        .from('permissions')
        .select('code, module, description')
        .order('module, code');

      if (permsError) throw permsError;

      // Load role permissions for this org
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('role, perm_code')
        .eq('org_id', userProfile.org_id);

      if (rolePermsError) throw rolePermsError;

      setPermissions(permsData || []);
      setRolePermissions(rolePermsData || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar permissões',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userProfile?.org_id]);

  const hasPermission = (role: string, permCode: string) => {
    return rolePermissions.some(rp => rp.role === role && rp.perm_code === permCode);
  };

  const togglePermission = async (role: string, permCode: string, enabled: boolean) => {
    if (!userProfile?.org_id) return;

    try {
      if (enabled) {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            org_id: userProfile.org_id,
            role,
            perm_code: permCode,
          });

        if (error) throw error;

        setRolePermissions(prev => [...prev, { role, perm_code: permCode }]);
      } else {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('org_id', userProfile.org_id)
          .eq('role', role)
          .eq('perm_code', permCode);

        if (error) throw error;

        setRolePermissions(prev => 
          prev.filter(rp => !(rp.role === role && rp.perm_code === permCode))
        );
      }

      toast({
        title: 'Sucesso',
        description: `Permissão ${enabled ? 'concedida' : 'removida'} para ${role}`,
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar permissão',
        variant: 'destructive',
      });
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await refreshPermissions();
      toast({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar permissões',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <BackLink />
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackLink />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Permissões da Organização</h1>
            <p className="text-muted-foreground">
              Gerencie permissões por papel na sua organização
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">Seu papel: {role}</Badge>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? 'Salvando...' : 'Atualizar Permissões'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="EDITOR" className="space-y-4">
          <TabsList>
            {ROLES.map(roleType => (
              <TabsTrigger key={roleType} value={roleType}>
                {roleType}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map(roleType => (
            <TabsContent key={roleType} value={roleType} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Permissões para {roleType}</CardTitle>
                  <CardDescription>
                    {roleType === 'MASTER' && 'Acesso total ao sistema (não editável)'}
                    {roleType === 'ADMIN' && 'Administrador com acesso a recursos avançados'}
                    {roleType === 'EDITOR' && 'Editor com acesso a criação e edição'}
                    {roleType === 'VIEWER' && 'Visualizador com acesso somente leitura'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, modulePerms]) => (
                    <div key={module} className="space-y-3">
                      <h3 className="font-semibold text-lg capitalize">{module}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePerms.map((perm) => (
                          <div key={perm.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${roleType}-${perm.code}`}
                              checked={roleType === 'MASTER' || hasPermission(roleType, perm.code)}
                              disabled={roleType === 'MASTER'}
                              onCheckedChange={(checked) => 
                                togglePermission(roleType, perm.code, !!checked)
                              }
                            />
                            <Label
                              htmlFor={`${roleType}-${perm.code}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              <div>
                                <div className="font-medium">{perm.code}</div>
                                <div className="text-xs text-muted-foreground">{perm.description}</div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}