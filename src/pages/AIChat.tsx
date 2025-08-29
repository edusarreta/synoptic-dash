import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AIDataChat } from '@/components/ai/AIDataChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Database, Zap, Shield } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function AIChat() {
  const { permissions, loading } = usePermissions();

  if (loading) {
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
          <p className="text-muted-foreground">You need editor or admin permissions to use AI features.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Data Chat</h1>
          <p className="text-muted-foreground mt-2">
            Ask questions about your data using natural language and get instant insights.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AIDataChat />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bot className="w-5 h-5" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Database className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Connect to your data</p>
                    <p className="text-xs text-muted-foreground">
                      Select a data source from your connections
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Ask in natural language</p>
                    <p className="text-xs text-muted-foreground">
                      Type questions like "What's our revenue this month?"
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Get safe SQL queries</p>
                    <p className="text-xs text-muted-foreground">
                      AI generates secure, read-only queries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Example questions</CardTitle>
                <CardDescription className="text-sm">Try asking these types of questions:</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    "What's our total revenue this quarter?"
                  </div>
                  <div className="p-2 bg-muted rounded">
                    "Show me top 10 customers by sales"
                  </div>
                  <div className="p-2 bg-muted rounded">
                    "How many orders did we have last month?"
                  </div>
                  <div className="p-2 bg-muted rounded">
                    "What's the average order value?"
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Badge variant="secondary">AI Credits</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Each AI question uses 1 credit. AI credits are allocated based on your subscription plan.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}