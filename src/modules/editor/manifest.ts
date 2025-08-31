import { ModuleManifest } from '../core/types';
import { EditorPage } from './pages/EditorPage';
import { Edit3 } from 'lucide-react';

export const editorModule: ModuleManifest = {
  key: 'editor',
  name: 'Dashboard Editor',
  version: '1.0.0',
  description: 'Drag & drop dashboard editor with visual chart builder',
  routes: [
    {
      path: '/editor',
      element: EditorPage,
      requiredPermissions: ['dashboards:create', 'dashboards:update']
    },
    {
      path: '/editor/:id',
      element: EditorPage,
      requiredPermissions: ['dashboards:read']
    }
  ],
  menuItems: [
    {
      key: 'editor',
      label: 'Editor',
      icon: Edit3,
      path: '/editor',
      requiredPermissions: ['dashboards:create']
    }
  ],
  permissions: [
    'editor:access',
    'editor:canvas:edit',
    'editor:shelves:use',
    'editor:inspector:configure'
  ],
  dependsOn: ['datasets', 'charts']
};