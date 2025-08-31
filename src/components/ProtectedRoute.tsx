import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/providers/SessionProvider";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { userProfile, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !userProfile) {
      navigate("/auth");
    }
  }, [userProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Will redirect to /auth
  }

  return <>{children}</>;
}