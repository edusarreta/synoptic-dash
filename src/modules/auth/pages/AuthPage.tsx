import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (location.pathname.includes('signup')) {
      setMode('signup');
    } else if (location.pathname.includes('reset')) {
      setMode('reset');
    } else {
      setMode('signin');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem');
          return;
        }
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        
        const { error } = await signUp(email, password, fullName, 'default-account');
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está cadastrado. Faça login.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Verifique seu email para ativar a conta');
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      }
    } catch (error: any) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'signup' ? 'Criar Conta' : 
             mode === 'reset' ? 'Redefinir Senha' : 'Entrar'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup' ? 'Crie sua conta para começar' :
             mode === 'reset' ? 'Digite seu email para redefinir a senha' :
             'Entre com suas credenciais'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signup' ? 'Criar Conta' :
               mode === 'reset' ? 'Enviar Email' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {mode === 'signin' && (
              <>
                <Button 
                  variant="link" 
                  onClick={() => setMode('signup')}
                  className="text-sm"
                >
                  Não tem conta? Criar conta
                </Button>
                <br />
                <Button 
                  variant="link" 
                  onClick={() => setMode('reset')}
                  className="text-sm"
                >
                  Esqueceu a senha?
                </Button>
              </>
            )}
            
            {mode === 'signup' && (
              <Button 
                variant="link" 
                onClick={() => setMode('signin')}
                className="text-sm"
              >
                Já tem conta? Fazer login
              </Button>
            )}
            
            {mode === 'reset' && (
              <Button 
                variant="link" 
                onClick={() => setMode('signin')}
                className="text-sm"
              >
                Voltar ao login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}