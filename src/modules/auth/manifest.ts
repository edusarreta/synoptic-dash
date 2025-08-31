import { ModuleManifest } from '../core/types';
import { AuthPage } from './pages/AuthPage';
import { Shield } from 'lucide-react';

export const authModule: ModuleManifest = {
  key: 'auth',
  name: 'Authentication',
  version: '1.0.0',
  description: 'User authentication and session management',
  routes: [
    {
      path: '/auth',
      element: AuthPage,
      layout: 'minimal'
    },
    {
      path: '/auth/signup',
      element: AuthPage,
      layout: 'minimal'
    },
    {
      path: '/auth/signin',
      element: AuthPage,
      layout: 'minimal'
    }
  ],
  menuItems: [],
  permissions: [
    'auth:signin',
    'auth:signup',
    'auth:signout',
    'auth:reset-password'
  ]
};