import axios from 'axios';
import configService from './configService';

// Función para crear cliente API con configuración dinámica
const createApiClient = async () => {
  const config = await configService.getBackendConfig();
  return axios.create({
    baseURL: config.apiUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Función para obtener cliente API actualizado
const getApiClient = async () => {
  const client = await createApiClient();
  
  // Interceptor para agregar token de autenticación si está disponible
  client.interceptors.request.use(
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

  return client;
};

// Interfaces para tipos de datos
export interface ConversationLogResponse {
  id: string;
  sessionName: string;
  userMessage?: string;
  aiResponse?: string;
  userName?: string;
  userPhone?: string;
  platform?: string;
  timestamp?: string;
  createdAt: string;
  userId?: number;
  agentId?: string;
}

export interface ConversationLogsApiResponse {
  success: boolean;
  data: ConversationLogResponse[];
  message?: string;
}

// Servicio de API para conversation logs
export const conversationLogApi = {
  /**
   * Obtener logs recientes para notificaciones
   * @param since - Timestamp ISO opcional desde el cual obtener logs
   * @returns Promise con la respuesta de la API
   */
  async getRecentForNotifications(since?: string): Promise<ConversationLogsApiResponse> {
    try {
      const client = await getApiClient();
      const params = since ? { since } : {};
      
      const response = await client.get('/conversation-logs/recent-for-notifications', {
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching recent conversation logs for notifications:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los logs recientes (últimas 24 horas)
   * @returns Promise con la respuesta de la API
   */
  async getRecent(): Promise<ConversationLogsApiResponse> {
    try {
      const client = await getApiClient();
      const response = await client.get('/conversation-logs/recent');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent conversation logs:', error);
      throw error;
    }
  }
};

export default conversationLogApi;