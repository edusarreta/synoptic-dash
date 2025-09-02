import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useSession } from "@/providers/SessionProvider";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/BackLink";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { userProfile, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando workspace...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Create breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    
    if (path === '/app') return 'Home';
    if (path === '/data-hub') return 'Home > Data Hub';
    if (path === '/dashboards') return 'Home > Dashboards';
    if (path === '/dashboards/new') return 'Home > Dashboards > Novo';
    if (path === '/settings') return 'Home > Configurações';
    if (path === '/org/permissions') return 'Home > Admin > Permissões';
    if (path.startsWith('/dashboards/') && path.includes('/edit')) return 'Home > Dashboards > Editor';
    
    return 'ConnectaDados';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center px-4 gap-4">
            <SidebarTrigger className="h-8 w-8" />
            <div className="flex-1 flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {getBreadcrumbs()}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/app'}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}