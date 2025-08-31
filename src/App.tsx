import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "./providers/SessionProvider";
import { RequireAuth } from "./components/RequireAuth";

// Public pages
import Index from "./pages/Index";
import Login from "./modules/auth/pages/Login";
import AuthCallback from "./modules/auth/pages/AuthCallback";
import PostAuth from "./modules/auth/pages/PostAuth";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

// Protected pages
import { App as AppHome } from "./pages/App";
import Dashboard from "./pages/Dashboard";
import DataSources from "./pages/DataSources";
import ChartBuilderWrapper from "./components/ChartBuilderWrapper";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import AIChat from "./pages/AIChat";
import Marketplace from "./pages/Marketplace";
import Ecosystem from "./pages/Ecosystem";
import SuperAdmin from "./pages/SuperAdmin";
import LookerDashboardBuilder from "./pages/LookerDashboardBuilder";
import { EditorPage } from "./modules/editor/pages/EditorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/post-auth" element={<PostAuth />} />
            <Route path="/demo" element={<Demo />} />
            
            {/* Protected routes */}
            <Route path="/app" element={<RequireAuth><AppHome /></RequireAuth>} />
            <Route path="/dashboards" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/data-sources" element={<RequireAuth><DataSources /></RequireAuth>} />
            <Route path="/charts/new" element={<RequireAuth><ChartBuilderWrapper /></RequireAuth>} />
            <Route path="/charts" element={<RequireAuth><ChartBuilderWrapper /></RequireAuth>} />
            <Route path="/looker-builder" element={<RequireAuth><LookerDashboardBuilder /></RequireAuth>} />
            <Route path="/editor" element={<RequireAuth><EditorPage /></RequireAuth>} />
            <Route path="/editor/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/ai-chat" element={<RequireAuth><AIChat /></RequireAuth>} />
            <Route path="/marketplace" element={<RequireAuth><Marketplace /></RequireAuth>} />
            <Route path="/ecosystem" element={<RequireAuth><Ecosystem /></RequireAuth>} />
            <Route path="/super-admin" element={<RequireAuth><SuperAdmin /></RequireAuth>} />
            <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;