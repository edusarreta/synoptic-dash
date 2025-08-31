import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Plus, TestTube } from 'lucide-react';
import { RequirePermission } from '../../core/rbac';

export function ConnectionsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conexões de Dados</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões com bancos de dados e APIs
          </p>
        </div>
        
        <RequirePermission perms="connections:create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conexão
          </Button>
        </RequirePermission>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* PostgreSQL Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">PostgreSQL</CardTitle>
                <CardDescription>Conectado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Host:</div>
              <div className="font-mono">localhost:5432</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Database:</div>
              <div className="font-mono">analytics_db</div>
            </div>
            <div className="flex gap-2">
              <RequirePermission perms="connections:test">
                <Button size="sm" variant="outline">
                  <TestTube className="w-4 h-4 mr-1" />
                  Testar
                </Button>
              </RequirePermission>
              <RequirePermission perms="connections:update">
                <Button size="sm" variant="outline">
                  Editar
                </Button>
              </RequirePermission>
            </div>
          </CardContent>
        </Card>

        {/* MySQL Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">MySQL</CardTitle>
                <CardDescription>Desconectado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Host:</div>
              <div className="font-mono">mysql.example.com</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Database:</div>
              <div className="font-mono">production</div>
            </div>
            <div className="flex gap-2">
              <RequirePermission perms="connections:test">
                <Button size="sm" variant="outline">
                  <TestTube className="w-4 h-4 mr-1" />
                  Testar
                </Button>
              </RequirePermission>
              <RequirePermission perms="connections:update">
                <Button size="sm" variant="outline">
                  Editar
                </Button>
              </RequirePermission>
            </div>
          </CardContent>
        </Card>

        {/* Add new connection card */}
        <RequirePermission perms="connections:create">
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center h-48 text-center space-y-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Nova Conexão</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte uma nova fonte de dados
                </p>
              </div>
            </CardContent>
          </Card>
        </RequirePermission>
      </div>
    </div>
  );
}