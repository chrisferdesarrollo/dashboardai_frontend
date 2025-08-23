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
    
    if (error.response?.status === 401) {
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
      throw new Error('Username y password son requeridos');
    }
    
    try {
      console.log('🔵 AuthService: URL completa:', `${API_BASE_URL}/auth/signin`);
      const response = await api.post<JwtResponse>('/auth/signin', credentials);
      console.log('✅ AuthService: Login exitoso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: Error en login:', error);
      throw error;
    }
  },

  // Registro
  async signup(data: SignupRequest): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/signup', data);
    return response.data;
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
