import { useState, useEffect } from 'react';
import { useSession } from '@/providers/SessionProvider';
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
  const { userProfile } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!userProfile) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userProfile.id)
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
  }, [userProfile]);

  return { permissions, loading };
}