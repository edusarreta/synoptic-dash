import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { SubscriptionProvider } from "./hooks/useSubscription";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboards" element={<Dashboard />} />
              <Route path="/data-sources" element={<DataSources />} />
              <Route path="/charts/new" element={<ChartBuilderWrapper />} />
              <Route path="/charts" element={<ChartBuilderWrapper />} />
              <Route path="/looker-builder" element={<LookerDashboardBuilder />} />
              <Route path="/analytics" element={<Dashboard />} />
              <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/ecosystem" element={<Ecosystem />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
