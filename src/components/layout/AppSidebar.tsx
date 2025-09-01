import { 
  BarChart3, 
  Database, 
  LayoutDashboard, 
  Settings, 
  LogOut,
  ChevronDown,
  Home,
  FileText,
  Eye,
  Shield
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
import { useSession } from "@/providers/SessionProvider";
import { usePermissions } from "@/modules/auth/PermissionsProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRAND } from '@/config/brand';

const navigationItems = [
  { title: "Home", url: "/app", icon: Home },
  { title: "Conexões", url: "/connections", icon: Database, permission: "connections:read" },
  { title: "Catálogo", url: "/catalog", icon: Eye, permission: "catalog:read" },
  { title: "Editor SQL", url: "/sql", icon: FileText, permission: "sql:run" },
  { title: "Dashboards", url: "/dashboards", icon: LayoutDashboard, permission: "dashboards:read" },
  { title: "Configurações", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "Usuários", url: "/admin/users", icon: Shield, permission: "rbac:read" },
  { title: "Permissões", url: "/org/permissions", icon: Shield, permission: "rbac:manage" },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { userProfile, signOut } = useSession();
  const { can } = usePermissions();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath.startsWith(path);
  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "text-muted-foreground hover:bg-muted hover:text-foreground";

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = userProfile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('') || userProfile?.email?.[0]?.toUpperCase() || 'U';

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
                {BRAND.APP_NAME}
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
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems
                .filter(item => !item.permission || can(item.permission))
                .map((item) => (
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

        {/* Admin Section */}
        {adminItems.some(item => !item.permission || can(item.permission)) && (
          <SidebarGroup className="px-2">
            <SidebarGroupLabel className={!open ? "sr-only" : ""}>
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems
                  .filter(item => !item.permission || can(item.permission))
                  .map((item) => (
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
        )}

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
                      {userProfile?.full_name || userProfile?.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userProfile?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
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