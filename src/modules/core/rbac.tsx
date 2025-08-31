import React, { createContext, useContext, ReactNode } from 'react';
import { UserProfile, Role } from './types';

interface RBACContextType {
  user: UserProfile | null;
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: Role | Role[]) => boolean;
  isLoading: boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Permission mappings by role
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  MASTER: [
    'orgs:*',
    'users:*', 
    'billing:*',
    'connections:*',
    'sql:*',
    'datasets:*',
    'charts:*',
    'dashboards:*',
    'embed:*',
    'audit:*'
  ],
  ADMIN: [
    'users:create', 'users:read', 'users:update',
    'billing:read',
    'connections:*',
    'sql:*',
    'datasets:*',
    'charts:*',
    'dashboards:*',
    'embed:use',
    'audit:read'
  ],
  EDITOR: [
    'connections:read',
    'sql:run',
    'datasets:*',
    'charts:*',
    'dashboards:create', 'dashboards:read', 'dashboards:update',
    'embed:use'
  ],
  VIEWER: [
    'connections:read',
    'datasets:read',
    'charts:read',
    'dashboards:read'
  ]
};

export function RBACProvider({ 
  children, 
  user, 
  isLoading 
}: { 
  children: ReactNode;
  user: UserProfile | null;
  isLoading: boolean;
}) {
  const hasPermission = (permission: string | string[]) => {
    if (!user) return false;
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    return permissions.some(perm => 
      userPermissions.some(userPerm => 
        userPerm === perm || 
        userPerm.endsWith(':*') && perm.startsWith(userPerm.slice(0, -1))
      )
    );
  };

  const hasRole = (role: Role | Role[]) => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  return (
    <RBACContext.Provider value={{ user, hasPermission, hasRole, isLoading }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

export function RequirePermission({ 
  perms, 
  children, 
  fallback 
}: { 
  perms: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useRBAC();
  
  if (hasPermission(perms)) {
    return <>{children}</>;
  }
  
  return <>{fallback || null}</>;
}

export function RequireRole({ 
  roles, 
  children, 
  fallback 
}: { 
  roles: Role | Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole } = useRBAC();
  
  if (hasRole(roles)) {
    return <>{children}</>;
  }
  
  return <>{fallback || null}</>;
}