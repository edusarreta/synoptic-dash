import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Download, Star, Database, BarChart3, Zap, Users, TrendingUp, DollarSign } from 'lucide-react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { usePermissions } from '@/hooks/usePermissions';

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'database':
      return Database;
    case 'crm':
      return Users;
    case 'analytics':
      return BarChart3;
    case 'sales':
      return TrendingUp;
    case 'marketing':
      return Zap;
    case 'finance':
      return DollarSign;
    default:
      return ShoppingBag;
  }
};

export default function Marketplace() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { items, installedItems, loading, installItem, uninstallItem, isItemInstalled } = useMarketplace();

  if (permissionsLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You need editor or admin permissions to access the marketplace.</p>
        </div>
      </AppLayout>
    );
  }

  const connectors = items.filter(item => item.type === 'connector');
  const templates = items.filter(item => item.type === 'template');
  const featuredItems = items.filter(item => item.is_featured);

  const handleInstall = async (itemId: string) => {
    try {
      await installItem(itemId);
    } catch (error) {
      console.error('Failed to install item:', error);
    }
  };

  const handleUninstall = async (itemId: string) => {
    const installedItem = installedItems.find(item => item.marketplace_item_id === itemId);
    if (installedItem) {
      try {
        await uninstallItem(installedItem.id);
      } catch (error) {
        console.error('Failed to uninstall item:', error);
      }
    }
  };

  const MarketplaceItemCard = ({ item }: { item: any }) => {
    const IconComponent = getCategoryIcon(item.category);
    const installed = isItemInstalled(item.id);

    return (
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
        {item.is_featured && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </Badge>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="mb-4 text-sm leading-relaxed">
            {item.description}
          </CardDescription>
          
          <div className="flex gap-2">
            {installed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUninstall(item.id)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Uninstall
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleInstall(item.id)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Extend your analytics platform with connectors and pre-built templates
          </p>
        </div>

        <Tabs defaultValue="featured" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="connectors">Connectors</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
          </TabsList>

          <TabsContent value="featured" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Featured Items</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredItems.map(item => (
                  <MarketplaceItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="connectors" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Data Connectors</h2>
              <p className="text-muted-foreground mb-6">
                Connect to external data sources and services
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectors.map(item => (
                  <MarketplaceItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Dashboard Templates</h2>
              <p className="text-muted-foreground mb-6">
                Pre-built dashboard templates for common use cases
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(item => (
                  <MarketplaceItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="installed" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Installed Items</h2>
              <p className="text-muted-foreground mb-6">
                Manage your installed marketplace items
              </p>
              {installedItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {installedItems.map(installedItem => (
                    <MarketplaceItemCard key={installedItem.id} item={installedItem.marketplace_items} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No installed items</h3>
                    <p className="text-muted-foreground text-center">
                      Browse the marketplace to install connectors and templates
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}