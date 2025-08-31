import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { RBACProvider } from "./modules/core/rbac";
import { SubscriptionProvider } from "./hooks/useSubscription";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Demo from "./pages/Demo";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import ChartBuilderWrapper from "./components/ChartBuilderWrapper";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Billing from "./pages/Billing";
import AIChat from "./pages/AIChat";
import Marketplace from "./pages/Marketplace";
import Ecosystem from "./pages/Ecosystem";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";
import LookerDashboardBuilder from "./pages/LookerDashboardBuilder";
import { EditorPage } from "./modules/editor/pages/EditorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        {(user, loading) => (
          <RBACProvider user={user} isLoading={loading}>
            <SubscriptionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboards" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/data-sources" element={<ProtectedRoute><DataSources /></ProtectedRoute>} />
              <Route path="/charts/new" element={<ProtectedRoute><ChartBuilderWrapper /></ProtectedRoute>} />
              <Route path="/charts" element={<ProtectedRoute><ChartBuilderWrapper /></ProtectedRoute>} />
              <Route path="/looker-builder" element={<ProtectedRoute><LookerDashboardBuilder /></ProtectedRoute>} />
              <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
              <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/ecosystem" element={<ProtectedRoute><Ecosystem /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
            </SubscriptionProvider>
          </RBACProvider>
        )}
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
