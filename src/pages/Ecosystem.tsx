import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmbeddedDashboardSDK } from '@/components/embedded/EmbeddedDashboardSDK';
import { DashboardComments } from '@/components/collaboration/DashboardComments';
import { VisualDataPrep } from '@/components/dataprep/VisualDataPrep';
import { AIGenerativeDashboards } from '@/components/ai/AIGenerativeDashboards';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, Globe, MessageCircle, Database, Sparkles } from 'lucide-react';

export default function Ecosystem() {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the ecosystem features.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ecosystem & Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Advanced features for embedded analytics, collaboration, data preparation, and AI-powered insights
          </p>
        </div>

        <Tabs defaultValue="embedded" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="embedded" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Embedded Analytics
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Collaboration
            </TabsTrigger>
            <TabsTrigger value="dataprep" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Preparation
            </TabsTrigger>
            <TabsTrigger value="ai-gen" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="embedded" className="space-y-6">
            <EmbeddedDashboardSDK 
              dashboardId="sample-dashboard-id" 
              dashboardName="Sample Dashboard" 
            />
          </TabsContent>

          <TabsContent value="collaboration" className="space-y-6">
            <DashboardComments 
              dashboardId="sample-dashboard-id" 
            />
          </TabsContent>

          <TabsContent value="dataprep" className="space-y-6">
            <VisualDataPrep />
          </TabsContent>

          <TabsContent value="ai-gen" className="space-y-6">
            <AIGenerativeDashboards />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}