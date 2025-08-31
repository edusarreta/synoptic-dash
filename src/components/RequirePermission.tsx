import React from 'react';
import { useSession } from '@/providers/SessionProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';

interface RequirePermissionProps {
  children: React.ReactNode;
  permissions: string[];
  fallback?: React.ReactNode;
}

export function RequirePermission({ children, permissions, fallback }: RequirePermissionProps) {
  const { user, loading: sessionLoading } = useSession();
  const { permissions: userPermissions, loading: permissionsLoading } = usePermissions();

  if (sessionLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user || !userPermissions) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Acesso negado</p>
        </div>
      </div>
    );
  }

  // Check if user has any of the required permissions
  const hasPermission = permissions.some(permission => {
    if (userPermissions.role === 'admin') return true;
    if (permission === 'dashboards:update_layout' && userPermissions.canCreateDashboards) return true;
    if (permission === 'charts:update_spec' && userPermissions.canCreateCharts) return true;
    if (permission === 'connections:read' && userPermissions.canManageConnections) return true;
    return false;
  });

  if (!hasPermission) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}