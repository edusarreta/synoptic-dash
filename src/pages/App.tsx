import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, BarChart3, FileText, Plus } from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { useSession } from '@/providers/SessionProvider';

export function App() {
  const { user } = useSession();

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Synoptic Dashboard</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button variant="outline" size="sm">
                  Configurações
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Bem-vindo!</h2>
            <p className="text-muted-foreground">
              Comece criando conexões com suas fontes de dados e construindo dashboards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Conectar Fonte de Dados</CardTitle>
                <CardDescription>
                  Configure conexões com PostgreSQL, MySQL, APIs e mais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/connections">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Conexão
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Editor SQL</CardTitle>
                <CardDescription>
                  Execute consultas, visualize dados e crie datasets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/sql">
                    Abrir Editor
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Novo Dashboard</CardTitle>
                <CardDescription>
                  Crie visualizações interativas com drag & drop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/editor">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Dashboard
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4">Acesso Rápido</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button asChild variant="ghost" className="justify-start h-auto p-4">
                <Link to="/dashboards" className="flex flex-col items-start">
                  <span className="font-medium">Meus Dashboards</span>
                  <span className="text-sm text-muted-foreground">Ver todos os dashboards</span>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-4">
                <Link to="/connections" className="flex flex-col items-start">
                  <span className="font-medium">Conexões</span>
                  <span className="text-sm text-muted-foreground">Gerenciar fontes de dados</span>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-4">
                <Link to="/sql" className="flex flex-col items-start">
                  <span className="font-medium">SQL Editor</span>
                  <span className="text-sm text-muted-foreground">Executar consultas</span>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-4">
                <Link to="/settings" className="flex flex-col items-start">
                  <span className="font-medium">Configurações</span>
                  <span className="text-sm text-muted-foreground">Conta e organização</span>
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}