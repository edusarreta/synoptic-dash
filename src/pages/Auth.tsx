import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountName, setAccountName] = useState("");

  // Check if we should show signup mode from URL params
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignUp(true);
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/looker-builder");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isSignUp) {
        if (!fullName || !accountName) {
          setError("Por favor, preencha todos os campos.");
          return;
        }
        
        const { error } = await signUp(email, password, fullName, accountName);
        
        if (error) {
          if (error.message.includes("User already registered")) {
            setError("Este email já está cadastrado. Tente fazer login.");
          } else if (error.message.includes("Password should be at least")) {
            setError("A senha deve ter pelo menos 6 caracteres.");
          } else {
            setError(error.message || "Erro ao criar conta.");
          }
        } else {
          toast.success("Conta criada com sucesso! Verifique seu email para confirmar.");
          // Stay on the page to show the success message
        }
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setError("Email ou senha incorretos.");
          } else if (error.message.includes("Email not confirmed")) {
            setError("Por favor, confirme seu email antes de fazer login.");
          } else {
            setError(error.message || "Erro ao fazer login.");
          }
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/looker-builder");
        }
      }
    } catch (err: any) {
      setError("Ocorreu um erro inesperado. Tente novamente.");
      console.error("Auth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-glow">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold gradient-primary bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              SynopticBI
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isSignUp ? "Crie sua conta para começar" : "Entre na sua conta"}
          </p>
        </div>

        {/* Auth Form */}
        <Card className="shadow-elevated">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isSignUp ? "Criar Conta" : "Entrar"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp 
                ? "Preencha os dados abaixo para criar sua conta" 
                : "Digite seu email e senha para acessar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Nome da Empresa/Conta</Label>
                    <Input
                      id="accountName"
                      type="text"
                      placeholder="Nome da sua empresa"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignUp ? "Mínimo 6 caracteres" : "Sua senha"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Criando conta..." : "Entrando..."}
                  </>
                ) : (
                  isSignUp ? "Criar Conta" : "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}
              </span>{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-primary font-medium"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setEmail("");
                  setPassword("");
                  setFullName("");
                  setAccountName("");
                }}
                disabled={isLoading}
              >
                {isSignUp ? "Fazer login" : "Criar conta"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to home */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            disabled={isLoading}
            className="text-muted-foreground"
          >
            ← Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}