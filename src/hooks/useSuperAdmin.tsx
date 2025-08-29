import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

interface SuperAdminAccount {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  suspendedAt?: string;
  suspendedBy?: string;
  adminUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  };
  subscription: {
    status: string;
    plan: string;
    billingCycle: string;
    nextBilling: string;
    trialEnd?: string;
  } | null;
  userCount: number;
}

interface AccountDetails {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  suspendedAt?: string;
  suspendedBy?: string;
  subscription: {
    id: string;
    status: string;
    plan: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  } | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }>;
  usage: {
    dashboards: number;
    dataConnections: number;
    charts: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    timestamp: string;
    metadata: any;
    userId: string;
  }>;
}

export function useSuperAdmin() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SuperAdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();

        if (!error && profile?.is_super_admin) {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdminStatus();
  }, [user]);

  const callSuperAdminAPI = async (endpoint: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`https://wioxxtyaxfvgnexuslky.supabase.co/functions/v1/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const loadAccounts = async (searchQuery?: string) => {
    if (!isSuperAdmin) {
      console.warn('User is not a super admin');
      return;
    }

    setLoading(true);
    try {
      const endpoint = searchQuery 
        ? `superadmin-accounts?search=${encodeURIComponent(searchQuery)}`
        : 'superadmin-accounts';
      
      const data = await callSuperAdminAPI(endpoint);
      setAccounts(data);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Error Loading Accounts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const suspendAccount = async (accountId: string): Promise<boolean> => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Super Admin privileges required",
        variant: "destructive",
      });
      return false;
    }

    try {
      await callSuperAdminAPI(`superadmin-suspend/${accountId}/suspend`, {
        method: 'POST',
      });

      toast({
        title: "Account Suspended",
        description: "The account has been successfully suspended.",
      });

      // Refresh accounts list
      loadAccounts();
      return true;
    } catch (error: any) {
      console.error('Error suspending account:', error);
      toast({
        title: "Error Suspending Account",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const reactivateAccount = async (accountId: string): Promise<boolean> => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Super Admin privileges required",
        variant: "destructive",
      });
      return false;
    }

    try {
      await callSuperAdminAPI(`superadmin-reactivate/${accountId}/reactivate`, {
        method: 'POST',
      });

      toast({
        title: "Account Reactivated",
        description: "The account has been successfully reactivated.",
      });

      // Refresh accounts list
      loadAccounts();
      return true;
    } catch (error: any) {
      console.error('Error reactivating account:', error);
      toast({
        title: "Error Reactivating Account",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const getAccountDetails = async (accountId: string): Promise<AccountDetails | null> => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Super Admin privileges required",
        variant: "destructive",
      });
      return null;
    }

    try {
      const data = await callSuperAdminAPI(`superadmin-account-details/${accountId}`);
      return data;
    } catch (error: any) {
      console.error('Error fetching account details:', error);
      toast({
        title: "Error Loading Account Details",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  // Load accounts when component mounts and user is super admin
  useEffect(() => {
    if (isSuperAdmin) {
      loadAccounts();
    }
  }, [isSuperAdmin]);

  return {
    accounts,
    loading,
    isSuperAdmin,
    loadAccounts,
    suspendAccount,
    reactivateAccount,
    getAccountDetails,
  };
}