import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGcAuth } from '@/hooks/useGcAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireGc?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireGc = false }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const { isGc, loading: gcLoading } = useGcAuth();

  if (isLoading || gcLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (requireGc) return <Navigate to="/gc/login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  if (requireGc && !isGc) {
    return <Navigate to="/gc/login" replace />;
  }

  // Block GC from admin/portal
  if (isGc && !requireGc) {
    return <Navigate to="/gc/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
