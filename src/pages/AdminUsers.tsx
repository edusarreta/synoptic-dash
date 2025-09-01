import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, Eye, Search, Filter, Mail, Building, Shield, Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string;
  account_id?: string;
  is_active: boolean;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminUsers() {
  const { userProfile } = useSession();
  const { can } = usePermissions();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!userProfile?.org_id) return;

    setLoading(true);
    try {
      // Load users from the same organization
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          org_id,
          is_active,
          created_at,
          organizations!inner(
            id,
            name,
            slug
          )
        `)
        .eq('org_id', userProfile.org_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar usuários",
          variant: "destructive",
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'MASTER':
        return 'destructive';
      case 'ADMIN':
        return 'secondary';
      case 'EDITOR':
        return 'default';
      case 'VIEWER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!can('rbac:read')) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Você não tem permissão para visualizar usuários
          </p>
          <BackLink />
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
              <h1 className="text-3xl font-bold">Usuários</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie usuários, contatos e permissões da organização
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Usuários
            </CardTitle>
            <CardDescription>
              Visualize todos os usuários da organização e suas informações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    <SelectItem value="MASTER">Master</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || roleFilter !== "all" 
                      ? "Nenhum usuário encontrado com os filtros aplicados"
                      : "Nenhum usuário encontrado"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {user.full_name || 'Sem nome'}
                            </h4>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                            {!user.is_active && (
                              <Badge variant="destructive">Inativo</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {user.organization?.name || 'Organização'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              Detalhes do Usuário
                            </SheetTitle>
                            <SheetDescription>
                              Informações de contato, organização e permissões
                            </SheetDescription>
                          </SheetHeader>
                          
                          {selectedUser && (
                            <div className="space-y-6 mt-6">
                              {/* Contact Information */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  Dados de Contato
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nome:</span>
                                    <span>{selectedUser.full_name || 'Não informado'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="break-all">{selectedUser.email}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
                                      {selectedUser.is_active ? "Ativo" : "Inativo"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Organization */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  Organização
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nome:</span>
                                    <span>{selectedUser.organization?.name || 'ConnectaDados'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Slug:</span>
                                    <span className="font-mono text-sm">
                                      {selectedUser.organization?.slug || 'connectadados'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Criado em:</span>
                                    <span>
                                      {new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Permissions */}
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Permissões Efetivas
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Papel Principal:</span>
                                    <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                                      {selectedUser.role}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedUser.role === 'MASTER' && (
                                      <p>✅ Acesso total ao sistema (bypass de permissões)</p>
                                    )}
                                    {selectedUser.role === 'ADMIN' && (
                                      <p>🔧 Gerenciar conexões, dashboards e configurações</p>
                                    )}
                                    {selectedUser.role === 'EDITOR' && (
                                      <p>✏️ Criar e editar consultas, charts e dashboards</p>
                                    )}
                                    {selectedUser.role === 'VIEWER' && (
                                      <p>👁️ Apenas visualização de dashboards e relatórios</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}