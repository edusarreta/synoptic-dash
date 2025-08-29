import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermissions {
  canManageUsers: boolean;
  canEditData: boolean;
  canCreateCharts: boolean;
  canCreateDashboards: boolean;
  canManageConnections: boolean;
  role: 'admin' | 'editor' | 'viewer';
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          const role = profile.role as 'admin' | 'editor' | 'viewer';
          
          setPermissions({
            role,
            canManageUsers: role === 'admin',
            canEditData: role === 'admin' || role === 'editor',
            canCreateCharts: role === 'admin' || role === 'editor',
            canCreateDashboards: role === 'admin' || role === 'editor',
            canManageConnections: role === 'admin' || role === 'editor',
          });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [user]);

  return { permissions, loading };
}