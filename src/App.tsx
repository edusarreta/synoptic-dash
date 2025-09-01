import React, { lazy } from "react";
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
import DashboardList from "./pages/DashboardList";
import DashboardWizard from "./pages/DashboardWizard";
import SuperAdmin from "./pages/SuperAdmin";

const AdminUsers = lazy(() => import("./pages/AdminUsers"));

const queryClient = new QueryClient();

// Component wrapper for authenticated routes with permissions
const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <RequireAuth>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </RequireAuth>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
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
                <AuthenticatedRoute>
                  <AppLayout>
                    <AppHome />
                  </AppLayout>
                </AuthenticatedRoute>
              } />
              
              <Route path="/connections" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["connections:read"]} mode="any">
                    <AppLayout>
                      <ConnectionsPage />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/catalog" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["catalog:read"]}>
                    <AppLayout>
                      <Catalog />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/sql" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["sql:run"]}>
                    <SQLEditor />
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              
              <Route path="/dashboards" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["dashboards:read"]}>
                    <AppLayout>
                      <DashboardList />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/dashboards/new" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["dashboards:create"]}>
                    <AppLayout>
                      <DashboardWizard />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/editor/:id" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["dashboards:update_layout", "charts:update_spec"]} mode="all">
                    <AppLayout>
                      <EditorPage />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/settings" element={
                <AuthenticatedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </AuthenticatedRoute>
              } />
              
              <Route path="/org/permissions" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["rbac:manage"]}>
                    <AppLayout>
                      <OrgPermissions />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/admin/users" element={
                <AuthenticatedRoute>
                  <RequirePermission perms={["rbac:read"]}>
                    <AppLayout>
                      <AdminUsers />
                    </AppLayout>
                  </RequirePermission>
                </AuthenticatedRoute>
              } />
              
              <Route path="/super-admin" element={
                <AuthenticatedRoute>
                  <AppLayout>
                    <SuperAdmin />
                  </AppLayout>
                </AuthenticatedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}