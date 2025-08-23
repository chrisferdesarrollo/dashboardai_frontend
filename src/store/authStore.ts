import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginRequest, SignupRequest, User } from '@/types/auth';
import { authService } from '@/services/authService';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      login: async (credentials: LoginRequest) => {
        try {
          console.log('🔵 AuthStore: Iniciando proceso de login');
          set({ isLoading: true });
          
          const response = await authService.login(credentials);
          console.log('🔵 AuthStore: Respuesta del servicio:', response);
          
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            roles: response.roles,
          };

          console.log('🔵 AuthStore: Usuario creado:', user);

          // Guardar token en localStorage
          localStorage.setItem('token', response.accessToken);
          console.log('🔵 AuthStore: Token guardado en localStorage');
          
          set({
            user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          console.log('✅ AuthStore: Login completado exitosamente');
        } catch (error) {
          console.error('❌ AuthStore: Error en login:', error);
          set({ isLoading: false });
          const errorMessage = error instanceof Error 
            ? error.message 
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error en el login';
          console.error('❌ AuthStore: Mensaje de error:', errorMessage);
          throw new Error(errorMessage);
        }
      },

      signup: async (data: SignupRequest) => {
        try {
          set({ isLoading: true });
          await authService.signup(data);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = error instanceof Error 
            ? error.message 
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error en el registro';
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshUser: async () => {
        try {
          console.log('🔵 AuthStore: Iniciando refreshUser');
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.log('🔴 AuthStore: No hay token, ejecutando logout');
            get().logout();
            return;
          }

          console.log('🔵 AuthStore: Verificando token...');
          const isValid = await authService.verifyToken();
          
          if (!isValid) {
            console.log('🔴 AuthStore: Token inválido, ejecutando logout');
            get().logout();
            return;
          }

          console.log('✅ AuthStore: Token válido');
          // Si llegamos aquí, el token es válido
          const currentState = get();
          if (currentState.user && currentState.token) {
            console.log('✅ AuthStore: Usuario y token presentes, marcando como autenticado');
            set({ isAuthenticated: true });
          } else {
            console.log('🔴 AuthStore: Falta usuario o token, ejecutando logout');
            get().logout();
          }
        } catch (error) {
          console.error('❌ AuthStore: Error en refreshUser:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
