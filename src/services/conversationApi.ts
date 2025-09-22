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

// Interfaces para TypeScript basadas en los DTOs del backend
export interface ConversationLogResponse {
  id: string;
  sessionName: string;
  userMessage: string;
  aiResponse: string;
  userName: string;
  userPhone?: string;
  timestamp: string;
  createdAt: string;
}

export interface CreateConversationLogRequest {
  sessionName: string;
  userMessage: string;
  aiResponse: string;
  userName: string;
  userPhone?: string;
  timestamp?: string;
}

export interface ConversationSessionSummary {
  sessionName: string;
  messageCount: number;
  startTime: string;
  lastActivity: string;
}

// Wrapper types para las respuestas del backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const conversationApi = {
  /**
   * Obtener todos los logs de conversación
   */
  async getAllConversationLogs(): Promise<ConversationLogResponse[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<ConversationLogResponse[]>>('/conversation-logs');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las conversaciones');
      }
    } catch (error) {
      console.error('Error fetching conversation logs:', error);
      throw error;
    }
  },

  /**
   * Obtener logs por nombre de sesión
   */
  async getConversationLogsBySession(sessionName: string): Promise<ConversationLogResponse[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<ConversationLogResponse[]>>(`/conversation-logs/session/${encodeURIComponent(sessionName)}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las conversaciones de la sesión');
      }
    } catch (error) {
      console.error('Error fetching conversation logs by session:', error);
      throw error;
    }
  },

  /**
   * Obtener logs por nombre de usuario
   */
  async getConversationLogsByUser(userName: string): Promise<ConversationLogResponse[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<ConversationLogResponse[]>>(`/conversation-logs/user/${encodeURIComponent(userName)}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las conversaciones del usuario');
      }
    } catch (error) {
      console.error('Error fetching conversation logs by user:', error);
      throw error;
    }
  },

  /**
   * Obtener logs recientes (últimas 24 horas)
   */
  async getRecentConversationLogs(): Promise<ConversationLogResponse[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<ConversationLogResponse[]>>('/conversation-logs/recent');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las conversaciones recientes');
      }
    } catch (error) {
      console.error('Error fetching recent conversation logs:', error);
      throw error;
    }
  },

  /**
   * Obtener todas las sesiones únicas
   */
  async getAllUniqueSessions(): Promise<string[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<string[]>>('/conversation-logs/sessions');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las sesiones');
      }
    } catch (error) {
      console.error('Error fetching unique sessions:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de conversaciones por sesión
   */
  async getConversationSessionsStats(): Promise<any[]> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<any[]>>('/conversation-logs/sessions/stats');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener las estadísticas de sesiones');
      }
    } catch (error) {
      console.error('Error fetching conversation sessions stats:', error);
      throw error;
    }
  },

  /**
   * Contar mensajes por sesión
   */
  async countMessagesBySession(sessionName: string): Promise<number> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<number>>(`/conversation-logs/session/${encodeURIComponent(sessionName)}/count`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al contar los mensajes de la sesión');
      }
    } catch (error) {
      console.error('Error counting messages by session:', error);
      throw error;
    }
  },

  /**
   * Obtener un log específico por ID
   */
  async getConversationLogById(logId: string): Promise<ConversationLogResponse> {
    try {
      const client = await getApiClient();
      const response = await client.get<ApiResponse<ConversationLogResponse>>(`/conversation-logs/${logId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al obtener el log de conversación');
      }
    } catch (error) {
      console.error('Error fetching conversation log by ID:', error);
      throw error;
    }
  },

  /**
   * Crear un nuevo log de conversación
   */
  async createConversationLog(logData: CreateConversationLogRequest): Promise<ConversationLogResponse> {
    try {
      const client = await getApiClient();
      const response = await client.post<ApiResponse<ConversationLogResponse>>('/conversation-logs', logData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Error al crear el log de conversación');
      }
    } catch (error) {
      console.error('Error creating conversation log:', error);
      throw error;
    }
  },

  /**
   * Función helper para transformar logs de conversación en formato de conversaciones agrupadas
   */
  async getConversationsGroupedBySession(): Promise<ConversationSessionSummary[]> {
    try {
      const statsData = await this.getConversationSessionsStats();
      
      // Transformar los datos del backend en el formato esperado
      return statsData.map((stat: any[]) => ({
        sessionName: stat[0] as string,
        messageCount: stat[1] as number,
        startTime: stat[2] as string,
        lastActivity: stat[3] as string,
      }));
    } catch (error) {
      console.error('Error getting conversations grouped by session:', error);
      throw error;
    }
  },

  /**
   * Buscar conversaciones por término de búsqueda
   */
  async searchConversations(searchTerm: string): Promise<ConversationLogResponse[]> {
    try {
      // Obtener todos los logs y filtrar por término de búsqueda en el frontend
      // En una implementación más completa, esto debería ser un endpoint específico en el backend
      const allLogs = await this.getAllConversationLogs();
      
      const filteredLogs = allLogs.filter(log => 
        log.userMessage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.aiResponse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.sessionName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return filteredLogs;
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }
};

export default conversationApi;