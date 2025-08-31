import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/providers/SessionProvider';

interface PermissionsContextType {
  permissions: string[];
  role: string;
  orgId: string | null;
  workspaceId: string | null;
  isLoadingOrg: boolean;
  isLoadingPerms: boolean;
  can: (permissionCode: string) => boolean;
  refetch: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string>('VIEWER');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isLoadingPerms, setIsLoadingPerms] = useState(true);

  const refetch = async () => {
    if (!userProfile?.org_id) {
      console.log('No org_id found, clearing permissions');
      setPermissions([]);
      setIsLoadingPerms(false);
      return;
    }

    try {
      setIsLoadingPerms(true);
      
      // Set current user role and org
      const currentRole = userProfile.role || 'VIEWER';
      const currentOrgId = userProfile.org_id;
      
      setRole(currentRole);
      setOrgId(currentOrgId);
      setIsLoadingOrg(false);
      
      console.log(`Loading permissions for user ${userProfile.email} with role ${currentRole} in org ${currentOrgId}`);
      
      // MASTER bypass - they have all permissions
      if (currentRole === 'MASTER') {
        console.log('🔑 MASTER user detected, granting all permissions');
        
        // Get all available permissions for MASTER
        const { data: allPerms, error } = await supabase
          .from('permissions')
          .select('code');
        
        if (error) {
          console.error('Error fetching all permissions for MASTER:', error);
          // Fallback: grant essential permissions for MASTER
          const fallbackPermissions = [
            'rbac:manage', 'dashboards:create', 'dashboards:read', 'dashboards:update', 'dashboards:delete',
            'charts:create', 'charts:read', 'charts:update', 'charts:delete',
            'connections:create', 'connections:read', 'connections:update', 'connections:delete',
            'datasets:create', 'datasets:read', 'datasets:update', 'datasets:delete',
            'catalog:read', 'sql:run', 'sql:save'
          ];
          console.log('🚨 Using hardcoded fallback permissions for MASTER');
          setPermissions(fallbackPermissions);
        } else {
          console.log(`✅ Granting ${allPerms?.length || 0} permissions to MASTER user`);
          setPermissions(allPerms?.map(p => p.code) || []);
        }
        setIsLoadingPerms(false);
        return;
      }
      
      // Get role-based permissions
      const { data: rolePerms, error: roleError } = await supabase
        .from('role_permissions')
        .select('perm_code')
        .eq('org_id', currentOrgId)
        .eq('role', currentRole);

      if (roleError) {
        console.error('Error fetching role permissions:', roleError);
      }

      // Get user-specific grants
      const { data: userGrants, error: grantsError } = await supabase
        .from('user_grants')
        .select('perm_code, effect')
        .eq('org_id', currentOrgId)
        .eq('user_id', userProfile.id);

      if (grantsError) {
        console.error('Error fetching user grants:', grantsError);
      }

      // Combine permissions
      const rolePermissions = rolePerms?.map(p => p.perm_code) || [];
      const allowedGrants = userGrants?.filter(g => g.effect === 'ALLOW').map(g => g.perm_code) || [];
      const deniedGrants = userGrants?.filter(g => g.effect === 'DENY').map(g => g.perm_code) || [];

      // Calculate final permissions (role + allowed grants - denied grants)
      const allPerms = [...new Set([...rolePermissions, ...allowedGrants])];
      const finalPerms = allPerms.filter(perm => !deniedGrants.includes(perm));

      console.log(`Permissions for ${currentRole}:`, finalPerms);
      setPermissions(finalPerms);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setIsLoadingPerms(false);
    }
  };

  useEffect(() => {
    if (userProfile?.org_id) {
      setIsLoadingOrg(false);
      refetch();
    } else {
      setIsLoadingOrg(true);
      setIsLoadingPerms(true);
    }
  }, [userProfile?.org_id, userProfile?.role]);

  const can = (permissionCode: string): boolean => {
    // MASTER bypass - they have all permissions
    if (role === 'MASTER') {
      console.log(`MASTER bypass: granting permission '${permissionCode}'`);
      return true;
    }
    
    const hasPermission = permissions.includes(permissionCode);
    console.log(`Permission check for '${permissionCode}': ${hasPermission ? 'GRANTED' : 'DENIED'} (role: ${role})`);
    return hasPermission;
  };

  const value = {
    permissions,
    role,
    orgId,
    workspaceId,
    isLoadingOrg,
    isLoadingPerms,
    can,
    refetch,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}