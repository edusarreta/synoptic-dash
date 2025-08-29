import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings2, Shield, Palette } from "lucide-react";
import { EnterpriseSettings } from "@/components/enterprise/EnterpriseSettings";
import { AuditLogs } from "@/components/enterprise/AuditLogs";
import { usePermissions } from "@/hooks/usePermissions";

export default function Settings() {
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and system configuration
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {permissions?.canManageUsers && (
              <>
                <TabsTrigger value="enterprise">
                  <Palette className="w-4 h-4 mr-2" />
                  Enterprise
                  <Badge variant="secondary" className="ml-2">Admin</Badge>
                </TabsTrigger>
                <TabsTrigger value="audit">
                  <Shield className="w-4 h-4 mr-2" />
                  Audit Logs
                  <Badge variant="secondary" className="ml-2">Admin</Badge>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Basic account and application preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    General settings will be available in future updates. For now, use the Enterprise tab to configure advanced settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {permissions?.canManageUsers && (
            <>
              <TabsContent value="enterprise">
                <EnterpriseSettings />
              </TabsContent>

              <TabsContent value="audit">
                <AuditLogs />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}