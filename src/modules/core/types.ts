export interface ModuleManifest {
  key: string;
  name: string;
  version: string;
  routes: RouteDefinition[];
  menuItems: MenuItem[];
  permissions: string[];
  featureFlags?: string[];
  dependsOn?: string[];
  description?: string;
}

export interface RouteDefinition {
  path: string;
  element: React.ComponentType;
  requiredPermissions?: string[];
  layout?: 'default' | 'minimal' | 'full';
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType;
  path?: string;
  requiredPermissions?: string[];
  children?: MenuItem[];
}

export type Role = 'MASTER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Permission {
  key: string;
  module: string;
  action: string;
  description: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  org_id: string;
  permissions: string[];
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  plan_type: 'FREE' | 'PRO' | 'ENTERPRISE';
  created_at: string;
  settings?: {
    billing_email?: string;
    features_enabled?: string[];
  };
}