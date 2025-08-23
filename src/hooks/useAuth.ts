import { useAuthStore } from '@/store/authStore';
import { LoginRequest, SignupRequest } from '@/types/auth';

export const useAuth = () => {
  const store = useAuthStore();

  const hasRole = (role: string): boolean => {
    if (!store.user) return false;
    return store.user.roles.some(userRole => userRole.includes(role));
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!store.user) return false;
    return roles.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  const isModerator = (): boolean => {
    return hasRole('MODERATOR') || hasRole('MOD');
  };

  const isUser = (): boolean => {
    return hasRole('USER');
  };

  return {
    // Estado
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,

    // Acciones
    login: store.login,
    signup: store.signup,
    logout: store.logout,
    refreshUser: store.refreshUser,

    // Utilidades de roles
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    isUser,
  };
};
