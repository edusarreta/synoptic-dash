import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
interface BackLinkProps {
  to?: string;
  label?: string;
  showHome?: boolean;
}
export function BackLink({
  to,
  label = "Voltar",
  showHome = true
}: BackLinkProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };
  const handleHome = () => {
    navigate('/app');
  };
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
      
      {showHome && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHome}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Home className="h-4 w-4" />
          Home
        </Button>
      )}
    </div>
  );
}