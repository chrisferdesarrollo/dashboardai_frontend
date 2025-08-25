import axios from 'axios';

// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const agentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación si está disponible
agentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Tipos para TypeScript
export interface CreateAgentRequest {
  name: string;
  description: string;
  platform: 'whatsapp' | 'telegram';
  prompt: string;
  workflowId?: string;
  platformConfig?: string;
  userId?: number;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  platform: 'whatsapp' | 'telegram';
  status: 'active' | 'inactive' | 'error';
  prompt: string;
  workflowId?: string;
  platformConfig?: string;
  totalExecutions: number;
  lastExecutionAt?: string;
  userId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentResponse {
  success: boolean;
  agent?: AgentResponse;
  error?: string;
}

export interface GetAgentsResponse {
  success: boolean;
  agents?: AgentResponse[];
  error?: string;
}

export interface AgentStatsResponse {
  totalAgents: number;
  activeAgents: number;
  whatsappAgents: number;
  telegramAgents: number;
}

export const agentService = {
  /**
   * Crear un nuevo agente
   */
  async createAgent(agentData: CreateAgentRequest): Promise<CreateAgentResponse> {
    try {
      console.log('Creating agent with data:', agentData);
      
      const response = await agentApi.post('/agents', agentData);
      
      console.log('Agent creation response:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('Error creating agent:', error);
      
      if (error.response) {
        // El servidor respondió con un error
        return {
          success: false,
          error: error.response.data?.error || error.response.data?.message || 'Error del servidor'
        };
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        return {
          success: false,
          error: 'No se pudo conectar con el servidor'
        };
      } else {
        // Error en la configuración de la petición
        return {
          success: false,
          error: 'Error en la petición: ' + error.message
        };
      }
    }
  },

  /**
   * Obtener todos los agentes
   */
  async getAgents(): Promise<GetAgentsResponse> {
    try {
      const response = await agentApi.get('/agents');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      return {
        success: false,
        error: 'Error al obtener los agentes'
      };
    }
  },

  /**
   * Obtener agentes por usuario
   */
  async getAgentsByUser(userId: number): Promise<GetAgentsResponse> {
    try {
      const response = await agentApi.get(`/agents/user/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user agents:', error);
      return {
        success: false,
        error: 'Error al obtener los agentes del usuario'
      };
    }
  },

  /**
   * Obtener un agente por ID
   */
  async getAgent(id: string): Promise<CreateAgentResponse> {
    try {
      const response = await agentApi.get(`/agents/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching agent:', error);
      return {
        success: false,
        error: 'Error al obtener el agente'
      };
    }
  },

  /**
   * Actualizar el estado de un agente
   */
  async updateAgentStatus(id: string, status: 'active' | 'inactive' | 'error'): Promise<CreateAgentResponse> {
    try {
      const response = await agentApi.put(`/agents/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error updating agent status:', error);
      return {
        success: false,
        error: 'Error al actualizar el estado del agente'
      };
    }
  },

  /**
   * Eliminar un agente
   */
  async deleteAgent(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await agentApi.delete(`/agents/${id}`);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        error: 'Error al eliminar el agente'
      };
    }
  },

  /**
   * Obtener estadísticas de agentes
   */
  async getAgentStats(): Promise<AgentStatsResponse | null> {
    try {
      const response = await agentApi.get('/agents/stats');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching agent stats:', error);
      return null;
    }
  },

  /**
   * Registrar una ejecución del agente
   */
  async incrementExecution(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await agentApi.post(`/agents/${id}/execution`);
      return { success: true };
    } catch (error: any) {
      console.error('Error incrementing execution:', error);
      return {
        success: false,
        error: 'Error al registrar la ejecución'
      };
    }
  }
};
