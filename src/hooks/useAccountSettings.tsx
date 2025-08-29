import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AccountSettings {
  id: string;
  account_id: string;
  company_name?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  custom_domain?: string;
  sso_enabled: boolean;
  sso_provider?: string;
  sso_config: any;
  white_label_enabled: boolean;
}

export function useAccountSettings() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data, error } = await supabase
          .from('account_settings')
          .select('*')
          .eq('account_id', profile.account_id)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found error
          throw error;
        }

        if (data) {
          setSettings(data);
        } else {
          // Create default settings if none exist
          const { data: newSettings, error: createError } = await supabase
            .from('account_settings')
            .insert({
              account_id: profile.account_id,
              primary_color: '#3b82f6',
              secondary_color: '#64748b',
              sso_enabled: false,
              white_label_enabled: false,
              sso_config: {}
            })
            .select()
            .single();

          if (createError) throw createError;
          setSettings(newSettings);
        }
      }
    } catch (error: any) {
      console.error('Error loading account settings:', error);
      toast({
        title: "Error",
        description: "Failed to load account settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AccountSettings>) => {
    if (!settings || !session) return;

    try {
      const { data, error } = await supabase
        .from('account_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);

      // Log the change
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'update_account_settings',
          resourceType: 'account_settings',
          resourceId: settings.id,
          metadata: { updated_fields: Object.keys(updates) }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      toast({
        title: "Settings Updated",
        description: "Account settings have been updated successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating account settings:', error);
      toast({
        title: "Error",
        description: "Failed to update account settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logAuditEvent = async (action: string, resourceType: string, resourceId?: string, metadata?: any) => {
    if (!session) return;

    try {
      await supabase.functions.invoke('audit-log', {
        body: { action, resourceType, resourceId, metadata },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings,
    logAuditEvent,
  };
}