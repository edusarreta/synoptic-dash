import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./providers/SessionProvider";
import { PermissionsProvider } from "./modules/auth/PermissionsProvider";
import { RequireAuth } from "./components/RequireAuth";
import { RequirePermission } from "./components/auth/RequirePermission";
import { AppLayout } from "./layouts/AppLayout";

// Public pages
import Index from "./pages/Index";
import { Login } from "./modules/auth/pages/Login";
import { AuthCallback } from "./modules/auth/pages/AuthCallback";
import { PostAuth } from "./modules/auth/pages/PostAuth";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

// Protected pages
import { App as AppHome } from "./pages/App";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import { EditorPage } from "./modules/editor/pages/EditorPage";
import { ConnectionsPage } from "./modules/connections/pages/ConnectionsPage";
import SQLEditor from "./pages/SQLEditor";
import Catalog from "./pages/Catalog";
import OrgPermissions from "./pages/OrgPermissions";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PermissionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/post-auth" element={<PostAuth />} />
                <Route path="/demo" element={<Demo />} />
                
                {/* Protected routes with unified layout */}
                <Route path="/app" element={
                  <RequireAuth>
                    <AppLayout>
                      <AppHome />
                    </AppLayout>
                  </RequireAuth>
                } />
                
                <Route path="/connections" element={
                  <RequireAuth>
                    <RequirePermission perms={["connections:read"]} mode="any">
                      <AppLayout>
                        <ConnectionsPage />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/catalog" element={
                  <RequireAuth>
                    <RequirePermission perms={["catalog:read"]}>
                      <AppLayout>
                        <Catalog />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/sql" element={
                  <RequireAuth>
                    <RequirePermission perms={["sql:run"]}>
                      <AppLayout>
                        <SQLEditor />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/dashboards" element={
                  <RequireAuth>
                    <RequirePermission perms={["dashboards:read"]}>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/dashboards/new" element={
                  <RequireAuth>
                    <RequirePermission perms={["dashboards:create"]}>
                      <AppLayout>
                        <EditorPage />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/editor/:id" element={
                  <RequireAuth>
                    <RequirePermission perms={["dashboards:update_layout", "charts:update_spec"]} mode="all">
                      <AppLayout>
                        <EditorPage />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                <Route path="/settings" element={
                  <RequireAuth>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </RequireAuth>
                } />
                
                <Route path="/org/permissions" element={
                  <RequireAuth>
                    <RequirePermission perms={["rbac:manage"]}>
                      <AppLayout>
                        <OrgPermissions />
                      </AppLayout>
                    </RequirePermission>
                  </RequireAuth>
                } />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </PermissionsProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}