import { useState } from "react";
import { 
  BarChart3, 
  Database, 
  LayoutDashboard, 
  Settings, 
  Users, 
  LogOut,
  ChevronDown,
  Plus,
  CreditCard,
  Bot,
  ShoppingBag,
  Presentation
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { title: "Looker Builder", url: "/looker-builder", icon: Presentation },
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard },
  { title: "Charts", url: "/charts", icon: BarChart3 },
  { title: "Data Sources", url: "/data-sources", icon: Database },
  { title: "AI Chat", url: "/ai-chat", icon: Bot },
  { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
  { title: "Ecosystem", url: "/ecosystem", icon: BarChart3 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const adminItems = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath.startsWith(path);
  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "text-muted-foreground hover:bg-muted hover:text-foreground";

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = user?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('') || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <Sidebar className={`border-r ${!open ? "w-14" : "w-64"}`} collapsible="icon">
      <SidebarContent className="bg-sidebar">
        {/* Header */}
        <div className="p-4 border-b">
          {open ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg gradient-primary bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                SynopticBI
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={!open ? "sr-only" : ""}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClass(item.url)}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {open && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={!open ? "sr-only" : ""}>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink 
                    to="/charts/new" 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClass("/charts/new")}`}
                  >
                    <Plus className="w-5 h-5 flex-shrink-0" />
                    {open && <span className="text-sm font-medium">New Chart</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink 
                    to="/billing" 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClass("/billing")}`}
                  >
                    <CreditCard className="w-5 h-5 flex-shrink-0" />
                    {open && <span className="text-sm font-medium">Billing</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink 
                    to="/settings" 
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClass("/settings")}`}
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    {open && <span className="text-sm font-medium">Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className={!open ? "sr-only" : ""}>
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${getNavClass(item.url)}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {open && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Menu */}
        <div className="mt-auto p-2 border-t">
          {open ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-12 px-3">
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              className="w-10 h-10 mx-auto"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}