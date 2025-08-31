import { ModuleManifest } from '../core/types';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { Database } from 'lucide-react';

export const connectionsModule: ModuleManifest = {
  key: 'connections',
  name: 'Data Connections',
  version: '1.0.0',
  description: 'Manage database connections and data sources',
  routes: [
    {
      path: '/connections',
      element: ConnectionsPage,
      requiredPermissions: ['connections:read']
    }
  ],
  menuItems: [
    {
      key: 'connections',
      label: 'Conexões',
      icon: Database,
      path: '/connections',
      requiredPermissions: ['connections:read']
    }
  ],
  permissions: [
    'connections:create',
    'connections:read', 
    'connections:update',
    'connections:delete',
    'connections:test'
  ]
};