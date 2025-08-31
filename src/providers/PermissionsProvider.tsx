import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './SessionProvider';

interface Permission {
  code: string;
  description: string;
  module: string;
}

interface PermissionsContextType {
  permissions: string[];
  role: string;
  can: (permissionCode: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string>('VIEWER');
  const [loading, setLoading] = useState(true);

  const refreshPermissions = async () => {
    if (!userProfile?.org_id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Set current user role
      const currentRole = userProfile.role || 'VIEWER';
      setRole(currentRole);
      
      // MASTER bypass - they have all permissions
      if (currentRole === 'MASTER') {
        const { data: allPerms } = await supabase
          .from('permissions')
          .select('code');
        
        setPermissions(allPerms?.map(p => p.code) || []);
        return;
      }
      
      // Get role-based permissions
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('perm_code')
        .eq('org_id', userProfile.org_id)
        .eq('role', currentRole);

      // Get user-specific grants
      const { data: userGrants } = await supabase
        .from('user_grants')
        .select('perm_code, effect')
        .eq('org_id', userProfile.org_id)
        .eq('user_id', userProfile.id);

      // Combine permissions
      const rolePermissions = rolePerms?.map(p => p.perm_code) || [];
      const allowedGrants = userGrants?.filter(g => g.effect === 'ALLOW').map(g => g.perm_code) || [];
      const deniedGrants = userGrants?.filter(g => g.effect === 'DENY').map(g => g.perm_code) || [];

      // Calculate final permissions (role + allowed grants - denied grants)
      const allPerms = [...new Set([...rolePermissions, ...allowedGrants])];
      const finalPerms = allPerms.filter(perm => !deniedGrants.includes(perm));

      setPermissions(finalPerms);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [userProfile?.org_id, userProfile?.role]);

  const can = (permissionCode: string): boolean => {
    // MASTER bypass
    if (role === 'MASTER') return true;
    return permissions.includes(permissionCode);
  };

  const value = {
    permissions,
    role,
    can,
    loading,
    refreshPermissions,
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