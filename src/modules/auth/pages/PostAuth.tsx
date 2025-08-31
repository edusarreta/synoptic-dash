import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function PostAuth() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando sua conta...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        // Verify user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Usuário não autenticado');

        setMessage('Configurando sua conta...');

        // Call bootstrap edge function
        const { data, error: bootstrapError } = await supabase.functions.invoke('bootstrap-user');
        
        if (bootstrapError) throw bootstrapError;

        setMessage('Redirecionando...');
        setStatus('success');

        // Check user memberships
        const userMemberships = data?.memberships || [];
        
        setTimeout(() => {
          if (userMemberships.length === 1) {
            // Single org/workspace - go directly to app
            navigate('/app', { replace: true });
          } else if (userMemberships.length > 1) {
            // Multiple orgs - let user select
            navigate('/select-org-workspace', { replace: true });
          } else {
            // No memberships - should not happen after bootstrap
            navigate('/app', { replace: true });
          }
        }, 1500);

      } catch (err: any) {
        console.error('Bootstrap error:', err);
        setStatus('error');
        setError(err.message || 'Erro ao configurar conta');
      }
    };

    bootstrapUser();
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <CardTitle>Configurando sua conta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Conta configurada!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Erro na configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}