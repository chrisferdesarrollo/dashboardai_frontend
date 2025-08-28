import axios from 'axios';
import configService from './configService';
import { n8nApi } from './n8nApi';
import { Agent } from '@/types/agent';

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

// Tipos para TypeScript
export interface CreateAgentRequest {
  name: string;
  description: string;
  platform: 'whatsapp' | 'telegram';
  prompt: string;
  workflowId?: string; // Para compatibilidad hacia atrás
  workflowIds?: string[]; // Nuevos campos para múltiples workflows
  primaryWorkflowId?: string;
  platformConfig?: string;
  userId?: number;
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
  agents?: AgentResponse[]; // Compatibilidad con respuesta del backend
  error?: string;
}

export interface AgentResponse {
  id: string; // UUID como string
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
      
      const agentApi = await getApiClient();
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
    console.log('🌐 AgentService.getAgents() iniciado');
    try {
      console.log('⚙️ Obteniendo cliente API...');
      const agentApi = await getApiClient();
      console.log('📡 Haciendo petición GET /agents...');
      const response = await agentApi.get('/agents');
      console.log('📥 Respuesta HTTP recibida:', response.status, response.statusText);
      console.log('📄 Datos de respuesta:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Error fetching agents:', error);
      if (axios.isAxiosError(error)) {
        console.error('📊 Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
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
      const agentApi = await getApiClient();
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
      const agentApi = await getApiClient();
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
      const agentApi = await getApiClient();
      const response = await agentApi.put(`/agents/${id}/status`, { status });
      return response.data;
    } catch (error: unknown) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  },

  /**
   * Eliminar un agente y su sesión asociada
   */
  async deleteAgent(id: string): Promise<void> {
    console.log('🗑️ [DELETEAGENT] Iniciando eliminación completa del agente:', id);
    try {
      const agentApi = await getApiClient();
      
      // 1. Primero obtener la información del agente para saber el tipo y configuración
      console.log('📊 [DELETEAGENT] Obteniendo información del agente antes de eliminar...');
      let agentInfo;
      try {
        const response = await agentApi.get(`/agents/${id}`);
        agentInfo = response.data;
        console.log('📄 [DELETEAGENT] Información del agente:', JSON.stringify(agentInfo, null, 2));
        
        // Extraer el agente de la respuesta si viene envuelto
        if (agentInfo.success && agentInfo.data) {
          agentInfo = agentInfo.data;
          console.log('🔧 [DELETEAGENT] Agente extraído de la respuesta:', JSON.stringify(agentInfo, null, 2));
        }
      } catch (error) {
        console.warn('⚠️ [DELETEAGENT] No se pudo obtener info del agente, continuando con eliminación:', error);
      }

      // 2. Si es un agente de WhatsApp, eliminar la sesión primero
      if (agentInfo && agentInfo.platform === 'whatsapp') {
        try {
          console.log('📱 [DELETEAGENT] Eliminando sesión de WhatsApp...');
          
          // Intentar obtener el sessionName desde la configuración de la plataforma
          let sessionName = `agent_${id}`; // Fallback por defecto
          
          if (agentInfo.platformConfig) {
            try {
              const platformConfig = typeof agentInfo.platformConfig === 'string' 
                ? JSON.parse(agentInfo.platformConfig) 
                : agentInfo.platformConfig;
              
              console.log('🔧 [DELETEAGENT] PlatformConfig parseado:', JSON.stringify(platformConfig, null, 2));
              
              if (platformConfig.sessionName) {
                sessionName = platformConfig.sessionName;
                console.log('📋 [DELETEAGENT] Usando sessionName de configuración:', sessionName);
              } else {
                console.warn('⚠️ [DELETEAGENT] No se encontró sessionName en platformConfig, usando fallback:', sessionName);
              }
            } catch (e) {
              console.warn('⚠️ [DELETEAGENT] Error parseando platformConfig, usando fallback:', e);
            }
          } else {
            console.warn('⚠️ [DELETEAGENT] No hay platformConfig, usando fallback:', sessionName);
          }
          
          console.log('🔄 [DELETEAGENT] LLAMANDO n8nApi.deleteWhatsAppSession con sessionName:', sessionName);
          const deleteResult = await n8nApi.deleteWhatsAppSession(sessionName);
          console.log('✅ [DELETEAGENT] Sesión de WhatsApp eliminada. Resultado:', JSON.stringify(deleteResult, null, 2));
          
        } catch (error) {
          console.error('❌ [DELETEAGENT] Error eliminando sesión de WhatsApp:', error);
          // No detenemos el proceso si falla la eliminación de la sesión
          console.warn('⚠️ [DELETEAGENT] Continuando con eliminación del agente a pesar del error en WhatsApp');
        }
      } else {
        console.log('ℹ️ [DELETEAGENT] No es un agente de WhatsApp o no se pudo obtener info, saltando eliminación de sesión');
      }

      // 3. Eliminar el agente de la base de datos
      console.log('🗄️ Eliminando agente de la base de datos...');
      await agentApi.delete(`/agents/${id}`);
      console.log('✅ Agente eliminado de la base de datos');
      
    } catch (error: unknown) {
      console.error('❌ Error deleting agent:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de agentes
   */
  async getAgentStats(): Promise<AgentStats> {
    try {
      const agentApi = await getApiClient();
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
      const agentApi = await getApiClient();
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
export function mapAgentResponseToAgent(agentResponse: AgentResponse): Agent {
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
    id: agentResponse.id, // Ya es string (UUID)
    name: agentResponse.name,
    description: agentResponse.description,
    platform: agentResponse.platform,
    status: agentResponse.status,
    workflowId: `wf_${agentResponse.id}`,
    lastExecution: new Date(agentResponse.updatedAt),
    totalExecutions: 0, // Por ahora no tenemos este dato
    settings: {
      apiKeys: {}, // Vacío por ahora
      prompts: {
        system: agentResponse.prompt,
      },
      variables: platformConfig, // Usar platformConfig como variables
    },
    createdAt: new Date(agentResponse.createdAt),
    updatedAt: new Date(agentResponse.updatedAt),
  };
}

export default agentService;
