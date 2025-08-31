import React from 'react';
import { usePermissions } from '@/modules/auth/PermissionsProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RequirePermissionProps {
  children: React.ReactNode;
  perms: string[];
  mode?: 'all' | 'any';
}

interface NoPermissionProps {
  onGoHome: string;
  showManageLink: boolean;
}

function PageSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function NoPermission({ onGoHome, showManageLink }: NoPermissionProps) {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Acesso Negado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate(onGoHome)} variant="default">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
            {showManageLink && (
              <Button 
                onClick={() => navigate('/org/permissions')} 
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar Permissões
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RequirePermission({ 
  children, 
  perms, 
  mode = 'all' 
}: RequirePermissionProps) {
  const { role, permissions, loading, can } = usePermissions();

  // Show loading skeleton while permissions are being fetched
  if (loading) {
    return <PageSkeleton />;
  }

  // MASTER bypass - has all permissions
  if (role === 'MASTER') {
    return <>{children}</>;
  }

  // Check permissions based on mode
  const allowed = mode === 'any' 
    ? perms.some(p => can(p))
    : perms.every(p => can(p));

  if (!allowed) {
    return (
      <NoPermission 
        onGoHome="/app" 
        showManageLink={role === 'MASTER' || can('rbac:manage')} 
      />
    );
  }

  return <>{children}</>;
}