import axios from 'axios';
import { LoginRequest, SignupRequest, JwtResponse } from '@/types/auth';

// En desarrollo usar el proxy, en producción la URL completa
const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8080/api';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔵 Request Interceptor:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'No token'
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response Interceptor:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Interceptor Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Solo redirigir automáticamente si NO es una petición de login
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/signin')) {
      console.warn('🔴 Token expirado o inválido, redirigiendo a login');
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login
  async login(credentials: LoginRequest): Promise<JwtResponse> {
    console.log('🔵 AuthService: Intentando login con:', { 
      username: credentials.username,
      passwordLength: credentials.password?.length || 0,
      apiBaseUrl: API_BASE_URL
    });
    
    // Verificar que los campos no estén vacíos
    if (!credentials.username?.trim() || !credentials.password?.trim()) {
      throw new Error('Usuario y contraseña son requeridos');
    }
    
    try {
      console.log('🔵 AuthService: URL completa:', `${API_BASE_URL}/auth/signin`);
      const response = await api.post<JwtResponse>('/auth/signin', credentials);
      console.log('✅ AuthService: Login exitoso:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ AuthService: Error en login:', error);
      
      // Manejo específico de errores de autenticación
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        switch (status) {
          case 401:
            throw new Error('Usuario o contraseña incorrectos');
          case 403:
            throw new Error('Acceso denegado. Verifique sus credenciales');
          case 404:
            throw new Error('Usuario no encontrado');
          case 500:
            throw new Error('Error del servidor. Intente más tarde');
          default:
            throw new Error(message || 'Error al iniciar sesión');
        }
      } else if (axios.isAxiosError(error) && error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifique su conexión');
      } else {
        throw new Error('Error al procesar la solicitud');
      }
    }
  },

  // Registro
  async signup(data: SignupRequest): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>('/auth/signup', data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ AuthService: Error en signup:', error);
      
      // Manejo específico de errores de registro
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        switch (status) {
          case 400:
            throw new Error(message || 'Datos de registro inválidos');
          case 409:
            throw new Error('El usuario ya existe');
          case 500:
            throw new Error('Error del servidor. Intente más tarde');
          default:
            throw new Error(message || 'Error al registrar usuario');
        }
      } else if (axios.isAxiosError(error) && error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifique su conexión');
      } else {
        throw new Error('Error al procesar la solicitud de registro');
      }
    }
  },

  // Verificar token (endpoint protegido para validar)
  async verifyToken(): Promise<boolean> {
    try {
      await api.get('/test/user');
      return true;
    } catch {
      return false;
    }
  },

  // Obtener información del usuario actual
  async getCurrentUser(): Promise<{ message: string }> {
    const response = await api.get('/test/user');
    return response.data;
  },
};

export { api };
