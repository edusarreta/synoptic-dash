import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Table as TableIcon, Code, Package } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { ConnectionsPanel } from "@/components/datahub/ConnectionsPanel";
import { CatalogPanel } from "@/components/datahub/CatalogPanel";
import { SQLEditorPanel } from "@/components/datahub/SQLEditorPanel";
import { DatasetsPanel } from "@/components/datahub/DatasetsPanel";
import { DataHubSidebar } from "@/components/datahub/DataHubSidebar";
import { useDataHubStore } from "@/hooks/useDataHubStore";

export default function DataHub() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState("connections");
  
  const {
    selectedConnectionId,
    selectedSchema,
    selectedTable,
    sqlQuery,
    queryResults
  } = useDataHubStore();

  // Check permissions
  const canViewConnections = can('connections:read') || can('connections:create');
  const canViewCatalog = can('catalog:read');
  const canRunSQL = can('sql:run');
  const canViewDatasets = can('datasets:read');

  if (!canViewConnections && !canViewCatalog && !canRunSQL && !canViewDatasets) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
        <p className="text-muted-foreground text-center mb-4">
          Você não tem permissão para acessar o hub de dados
        </p>
        <BackLink />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <BackLink />
          <div className="ml-4">
            <h1 className="text-2xl font-bold">Data Hub</h1>
            <p className="text-muted-foreground text-sm">
              Centro unificado de dados, conexões e análises
            </p>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30">
          <DataHubSidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                {canViewConnections && (
                  <TabsTrigger 
                    value="connections" 
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    <Database className="h-4 w-4" />
                    Conexões
                  </TabsTrigger>
                )}
                {canViewCatalog && (
                  <TabsTrigger 
                    value="catalog" 
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    <TableIcon className="h-4 w-4" />
                    Catálogo
                  </TabsTrigger>
                )}
                {canRunSQL && (
                  <TabsTrigger 
                    value="sql" 
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    <Code className="h-4 w-4" />
                    SQL Editor
                  </TabsTrigger>
                )}
                {canViewDatasets && (
                  <TabsTrigger 
                    value="datasets" 
                    className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  >
                    <Package className="h-4 w-4" />
                    Datasets
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-6 h-[calc(100%-4rem)] overflow-auto">
              {canViewConnections && (
                <TabsContent value="connections" className="mt-0 h-full">
                  <ConnectionsPanel />
                </TabsContent>
              )}
              
              {canViewCatalog && (
                <TabsContent value="catalog" className="mt-0 h-full">
                  <CatalogPanel />
                </TabsContent>
              )}
              
              {canRunSQL && (
                <TabsContent value="sql" className="mt-0 h-full">
                  <SQLEditorPanel />
                </TabsContent>
              )}
              
              {canViewDatasets && (
                <TabsContent value="datasets" className="mt-0 h-full">
                  <DatasetsPanel />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}