import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, BarChart3, FileText, Plus } from 'lucide-react';
import { useSession } from '@/providers/SessionProvider';
import { usePermissions } from '@/providers/PermissionsProvider';

export function App() {
  const { user } = useSession();
  const { can } = usePermissions();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bem-vindo ao SynopticBI!</h1>
        <p className="text-muted-foreground">
          Comece criando conexões com suas fontes de dados e construindo dashboards.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Conectar Fonte de Dados</CardTitle>
            <CardDescription>
              Configure conexões com PostgreSQL, Supabase, APIs e mais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" disabled={!can("connections:create")}>
              <Link to="/connections">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conexão
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Editor SQL</CardTitle>
            <CardDescription>
              Execute consultas, visualize dados e crie datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled={!can("sql:run")}>
              <Link to="/sql">
                Abrir Editor
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle>Novo Dashboard</CardTitle>
            <CardDescription>
              Crie visualizações interativas com drag & drop
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled={!can("dashboards:create")}>
              <Link to="/dashboards/new">
                <Plus className="w-4 h-4 mr-2" />
                Criar Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {can("dashboards:read") && (
            <Button asChild variant="ghost" className="justify-start h-auto p-4">
              <Link to="/dashboards" className="flex flex-col items-start">
                <span className="font-medium">Meus Dashboards</span>
                <span className="text-sm text-muted-foreground">Ver todos os dashboards</span>
              </Link>
            </Button>
          )}
          
          {can("connections:read") && (
            <Button asChild variant="ghost" className="justify-start h-auto p-4">
              <Link to="/connections" className="flex flex-col items-start">
                <span className="font-medium">Conexões</span>
                <span className="text-sm text-muted-foreground">Gerenciar fontes de dados</span>
              </Link>
            </Button>
          )}
          
          {can("catalog:read") && (
            <Button asChild variant="ghost" className="justify-start h-auto p-4">
              <Link to="/catalog" className="flex flex-col items-start">
                <span className="font-medium">Catálogo</span>
                <span className="text-sm text-muted-foreground">Explorar dados</span>
              </Link>
            </Button>
          )}
          
          {can("sql:run") && (
            <Button asChild variant="ghost" className="justify-start h-auto p-4">
              <Link to="/sql" className="flex flex-col items-start">
                <span className="font-medium">SQL Editor</span>
                <span className="text-sm text-muted-foreground">Executar consultas</span>
              </Link>
            </Button>
          )}
          
          <Button asChild variant="ghost" className="justify-start h-auto p-4">
            <Link to="/settings" className="flex flex-col items-start">
              <span className="font-medium">Configurações</span>
              <span className="text-sm text-muted-foreground">Conta e organização</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}