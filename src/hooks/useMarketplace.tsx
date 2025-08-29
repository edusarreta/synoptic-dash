import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  icon_url?: string;
  config: any;
  is_featured: boolean;
  is_active: boolean;
}

interface InstalledItem {
  id: string;
  marketplace_item_id: string;
  config: any;
  is_active: boolean;
  installed_at: string;
  marketplace_items: MarketplaceItem;
}

export function useMarketplace() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [installedItems, setInstalledItems] = useState<InstalledItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMarketplaceItems = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error loading marketplace items:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace items",
        variant: "destructive",
      });
    }
  };

  const loadInstalledItems = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data, error } = await supabase
          .from('installed_marketplace_items')
          .select(`
            *,
            marketplace_items (*)
          `)
          .eq('account_id', profile.account_id)
          .eq('is_active', true);

        if (error) throw error;
        setInstalledItems(data || []);
      }
    } catch (error: any) {
      console.error('Error loading installed items:', error);
    }
  };

  const installItem = async (itemId: string, config?: any) => {
    if (!user || !session) throw new Error('Not authenticated');

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('installed_marketplace_items')
        .insert({
          account_id: profile.account_id,
          marketplace_item_id: itemId,
          installed_by: user.id,
          config: config || {}
        })
        .select(`
          *,
          marketplace_items (*)
        `)
        .single();

      if (error) throw error;

      setInstalledItems(prev => [...prev, data]);

      // Log the installation
      await supabase.functions.invoke('audit-log', {
        body: {
          action: 'install_marketplace_item',
          resourceType: 'marketplace_item',
          resourceId: itemId,
          metadata: { item_name: data.marketplace_items.name }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      toast({
        title: "Item Installed",
        description: `${data.marketplace_items.name} has been installed successfully`,
      });

      return data;
    } catch (error: any) {
      console.error('Error installing item:', error);
      toast({
        title: "Installation Failed",
        description: error.message || "Failed to install marketplace item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const uninstallItem = async (installedItemId: string) => {
    if (!session) throw new Error('Not authenticated');

    try {
      const installedItem = installedItems.find(item => item.id === installedItemId);
      
      const { error } = await supabase
        .from('installed_marketplace_items')
        .update({ is_active: false })
        .eq('id', installedItemId);

      if (error) throw error;

      setInstalledItems(prev => prev.filter(item => item.id !== installedItemId));

      // Log the uninstallation
      if (installedItem) {
        await supabase.functions.invoke('audit-log', {
          body: {
            action: 'uninstall_marketplace_item',
            resourceType: 'marketplace_item',
            resourceId: installedItem.marketplace_item_id,
            metadata: { item_name: installedItem.marketplace_items.name }
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }

      toast({
        title: "Item Uninstalled",
        description: "Marketplace item has been uninstalled",
      });
    } catch (error: any) {
      console.error('Error uninstalling item:', error);
      toast({
        title: "Uninstallation Failed",
        description: error.message || "Failed to uninstall marketplace item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const isItemInstalled = (itemId: string) => {
    return installedItems.some(item => item.marketplace_item_id === itemId);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadMarketplaceItems(),
        loadInstalledItems()
      ]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  return {
    items,
    installedItems,
    loading,
    installItem,
    uninstallItem,
    isItemInstalled,
    refreshItems: loadMarketplaceItems,
    refreshInstalledItems: loadInstalledItems,
  };
}