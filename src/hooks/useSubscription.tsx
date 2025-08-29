import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  createCheckoutSession: (planType: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

interface SubscriptionData {
  subscribed: boolean;
  plan_type: string;
  status: string;
  trial_days_left?: number;
  current_period_end?: string;
  dashboards_limit: number;
  data_connections_limit: number;
  monthly_queries_limit: number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user || !session) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Checking subscription status...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Get plan limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data: limits } = await supabase
          .rpc('check_subscription_status', { account_uuid: profile.account_id })
          .single();

        if (limits) {
          setSubscription({
            ...data,
            dashboards_limit: limits.dashboards_limit,
            data_connections_limit: limits.data_connections_limit,
            monthly_queries_limit: limits.monthly_queries_limit,
          });
        } else {
          setSubscription(data);
        }
      } else {
        setSubscription(data);
      }

      console.log('Subscription status updated:', data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (planType: string) => {
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan_type: planType },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;

    if (data.url) {
      window.open(data.url, '_blank');
    }
  };

  const openCustomerPortal = async () => {
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;

    if (data.url) {
      window.open(data.url, '_blank');
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [user, session]);

  // Auto-refresh every 30 seconds when on billing/subscription related pages
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.location.pathname.includes('billing') || window.location.pathname.includes('subscription')) {
        refreshSubscription();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    subscription,
    loading,
    refreshSubscription,
    createCheckoutSession,
    openCustomerPortal,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}