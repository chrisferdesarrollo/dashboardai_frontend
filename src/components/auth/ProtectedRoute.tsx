import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ children, requiredRoles = [] }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading, refreshUser } = useAuthStore();
  const location = useLocation();

  console.log('🔵 ProtectedRoute: Estado actual:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    user: user ? { id: user.id, username: user.username } : null,
    currentPath: location.pathname,
    tokenInStorage: !!localStorage.getItem('token')
  });

  useEffect(() => {
    console.log('🔵 ProtectedRoute: useEffect ejecutado');
    // Verificar autenticación al cargar la ruta
    if (!isAuthenticated && localStorage.getItem('token')) {
      console.log('🔵 ProtectedRoute: Token encontrado pero no autenticado, refrescando usuario');
      refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  // Mostrar loader mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">
            Verificando autenticación...
          </p>
        </div>
      </div>
    );
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles si se especificaron
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => 
      user.roles.some(userRole => userRole.includes(role))
    );

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Acceso Denegado
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No tienes permisos para acceder a esta página.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
