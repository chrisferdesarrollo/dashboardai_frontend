import axios from 'axios';

// Configuration for backend proxy
const BACKEND_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8080/api';

// Create axios instance for backend calls
const backendApi = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token if available
backendApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Test n8n connection through backend proxy
 */
export const testN8nConnection = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    console.log('🔍 Testing n8n connection through backend proxy...');
    
    const response = await backendApi.post('/n8n-proxy/test-connection', {
      test: true,
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ n8n connection test response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error testing n8n connection:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Error de conexión al backend'
      };
    }
    
    return {
      success: false,
      error: 'Error inesperado al probar la conexión'
    };
  }
};

/**
 * Get workflows from n8n through backend proxy
 */
export const getN8nWorkflows = async (): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    console.log('🔍 Getting workflows from n8n through backend proxy...');
    
    const response = await backendApi.get('/n8n-proxy/workflows');
    
    console.log('✅ n8n workflows response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error getting workflows:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Error de conexión al backend'
      };
    }
    
    return {
      success: false,
      error: 'Error inesperado al obtener workflows'
    };
  }
};

/**
 * Create WhatsApp session through backend proxy
 */
export const createWhatsAppSession = async (agentId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    console.log('🔍 Creating WhatsApp session through backend proxy...', { agentId });
    
    const response = await backendApi.post('/n8n-proxy/whatsapp/create-session', {
      agentId,
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ WhatsApp session creation response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error creating WhatsApp session:', error);
    
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Error de conexión al backend'
      };
    }
    
    return {
      success: false,
      error: 'Error inesperado al crear sesión de WhatsApp'
    };
  }
};

export default {
  testN8nConnection,
  getN8nWorkflows,
  createWhatsAppSession,
};
