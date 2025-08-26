import axios from 'axios';
import configService from './configService';

// Función para crear cliente API con configuración dinámica
const createApiClient = () => {
  const config = configService.getBackendConfig();
  return axios.create({
    baseURL: config.apiUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Función para obtener cliente API actualizado
const getApiClient = () => {
  const client = createApiClient();
  
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

// Tipos para TypeScript
export interface CreateAgentRequest {
  name: string;
  description: string;
  platform: 'whatsapp' | 'telegram';
  prompt: string;
  status?: 'active' | 'inactive' | 'error';
  phoneNumber?: string;
  botToken?: string;
}

export interface CreateAgentResponse {
  success: boolean;
  data?: AgentResponse;
  error?: string;
}

export interface GetAgentsResponse {
  success: boolean;
  data?: AgentResponse[];
  error?: string;
}

export interface AgentResponse {
  id: number;
  name: string;
  description: string;
  platform: 'whatsapp' | 'telegram';
  status: 'active' | 'inactive' | 'error';
  prompt: string;
  phoneNumber?: string;
  botToken?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  error: number;
}

export const agentService = {
  /**
   * Crear un nuevo agente
   */
  async createAgent(agentData: CreateAgentRequest): Promise<CreateAgentResponse> {
    try {
      console.log('Creating agent with data:', agentData);
      
      const agentApi = getApiClient();
      const response = await agentApi.post('/agents', agentData);
      
      console.log('Agent creation response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error creating agent:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response: { data?: { error?: string; message?: string } } };
        return {
          success: false,
          error: errorResponse.response.data?.error || errorResponse.response.data?.message || 'Error del servidor'
        };
      } else if (error && typeof error === 'object' && 'request' in error) {
        return {
          success: false,
          error: 'No se pudo conectar con el servidor'
        };
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
          success: false,
          error: 'Error en la petición: ' + errorMessage
        };
      }
    }
  },

  /**
   * Obtener todos los agentes
   */
  async getAgents(): Promise<GetAgentsResponse> {
    try {
      const agentApi = getApiClient();
      const response = await agentApi.get('/agents');
      return response.data;
    } catch (error: unknown) {
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
      const agentApi = getApiClient();
      const response = await agentApi.get(`/agents/user/${userId}`);
      return response.data;
    } catch (error: unknown) {
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
  async getAgentById(id: number): Promise<AgentResponse> {
    try {
      const agentApi = getApiClient();
      const response = await agentApi.get(`/agents/${id}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching agent:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de un agente
   */
  async updateAgentStatus(id: number, status: string): Promise<AgentResponse> {
    try {
      const agentApi = getApiClient();
      const response = await agentApi.put(`/agents/${id}/status`, { status });
      return response.data;
    } catch (error: unknown) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  },

  /**
   * Eliminar un agente
   */
  async deleteAgent(id: number): Promise<void> {
    try {
      const agentApi = getApiClient();
      await agentApi.delete(`/agents/${id}`);
    } catch (error: unknown) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de agentes
   */
  async getAgentStats(): Promise<AgentStats> {
    try {
      const agentApi = getApiClient();
      const response = await agentApi.get('/agents/stats');
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching agent stats:', error);
      throw error;
    }
  },

  /**
   * Ejecutar un agente
   */
  async executeAgent(id: number): Promise<void> {
    try {
      const agentApi = getApiClient();
      await agentApi.post(`/agents/${id}/execution`);
    } catch (error: unknown) {
      console.error('Error executing agent:', error);
      throw error;
    }
  },
};

/**
 * Función para mapear AgentResponse a Agent (tipo del frontend)
 */
export function mapAgentResponseToAgent(agentResponse: AgentResponse): any {
  let platformConfig: Record<string, unknown> = {};
  
  if (agentResponse.platform === 'whatsapp') {
    platformConfig = {
      phoneNumber: agentResponse.phoneNumber || '',
    };
  } else if (agentResponse.platform === 'telegram') {
    platformConfig = {
      botToken: agentResponse.botToken || '',
    };
  }

  return {
    id: agentResponse.id.toString(),
    name: agentResponse.name,
    description: agentResponse.description,
    platform: agentResponse.platform,
    status: agentResponse.status,
    workflowId: `wf_${agentResponse.id}`,
    lastExecution: new Date(agentResponse.updatedAt),
    totalExecutions: 0, // Por ahora no tenemos este dato
    settings: {
      prompts: {
        system: agentResponse.prompt,
      },
      platformConfig,
    },
    createdAt: new Date(agentResponse.createdAt),
    updatedAt: new Date(agentResponse.updatedAt),
  };
}

export default agentService;
