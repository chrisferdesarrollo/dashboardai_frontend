import axios from 'axios';
import configService from './configService';
import { whatsappApi } from './whatsappApi';
import { Agent, WhatsAppPlatformConfig } from '@/types/agent';

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
  sessionName?: string; // ✅ AGREGADO: Campo para sessionName que se guardará en BD
  workflowId?: string; // Para compatibilidad hacia atrás
  workflowIds?: string[]; // Nuevos campos para múltiples workflows
  primaryWorkflowId?: string;
  platformConfig?: string;
  userId?: number;
  status?: 'active' | 'inactive' | 'error';
  phoneNumber?: string;
  botToken?: string;
  customConfig?: {
    responseDelay?: number;
    maxResponseLength?: number;
    useTypingIndicator?: boolean;
    autoReply?: boolean;
    apiKeys?: {
      openai?: string;
      anthropic?: string;
      custom?: string;
    };
    dataSources?: {
      knowledgeBase?: string;
      database?: string;
      webhook?: string;
    };
    personality?: {
      tone?: string;
      formality?: string;
      language?: string;
    };
    businessHours?: {
      enabled?: boolean;
      start?: string;
      end?: string;
      timezone?: string;
      outsideHoursMessage?: string;
    };
    fallbackBehavior?: {
      enabled?: boolean;
      message?: string;
      transferToHuman?: boolean;
      retryAttempts?: number;
    };
    escalationRules?: {
      keywords?: string[];
      conditions?: string[];
      autoTransferAfter?: number;
      workingHours?: boolean;
    };
    leadCapture?: {
      enabled?: boolean;
      requiredFields?: string[];
      qualification?: {
        budget?: boolean;
        timeline?: boolean;
        decision_maker?: boolean;
      };
    };
  };
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
  sessionName?: string; // 🔧 RENOMBRADO: sessionName en lugar de workflowId
  platformConfig?: string | object; // 🔧 AÑADIDO: platformConfig del backend (puede ser JSON string u objeto)
  totalExecutions?: number; // 🔧 AÑADIDO: total de ejecuciones
  lastExecutionAt?: string; // 🔧 AÑADIDO: fecha de última ejecución
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
    console.log('🔵 [VPS DEBUG] getAgentsByUser() iniciado con userId:', userId);
    try {
      console.log('🔵 [VPS DEBUG] Obteniendo cliente API...');
      const agentApi = await getApiClient();
      console.log('🔵 [VPS DEBUG] Cliente API obtenido, base URL:', agentApi.defaults.baseURL);
      
      const endpoint = `/agents/user/${userId}`;
      console.log('🔵 [VPS DEBUG] Haciendo petición GET a:', endpoint);
      
      const response = await agentApi.get(endpoint);
      console.log('🔵 [VPS DEBUG] Respuesta recibida:', response.status, response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('🔴 [VPS DEBUG] Error fetching user agents:', error);
      if (axios.isAxiosError(error)) {
        console.error('🔴 [VPS DEBUG] Error response:', error.response?.status, error.response?.data);
        console.error('🔴 [VPS DEBUG] Error URL:', error.config?.url);
      }
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
  async updateAgentStatus(id: string, status: string): Promise<AgentResponse> {
    try {
      const agentApi = await getApiClient();
      console.log('🔄 [UPDATE-STATUS] Actualizando estado del agente:', { id, status });
      
      // Usar el endpoint unificado que acabamos de crear
      const response = await agentApi.put(`/agents/${id}/status`, {
        whatsappStatus: status, // Para agentes WhatsApp
        telegramStatus: status  // Para agentes Telegram (cuando esté implementado)
      });
      
      console.log('✅ [UPDATE-STATUS] Estado actualizado exitosamente:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ [UPDATE-STATUS] Error updating agent status:', error);
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
          
          console.log('🔄 [DELETEAGENT] LLAMANDO whatsappApi.deleteWhatsAppSession con sessionName:', sessionName);
          const deleteResult = await whatsappApi.deleteWhatsAppSession(sessionName);
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

  /**
   * Desconectar sesión de WhatsApp de un agente
   */
  async disconnectWhatsAppSession(agentId: string): Promise<void> {
    console.log('🔌 [DISCONNECT] Función de desconexión deshabilitada para agente:', agentId);
  },

  /**
   * Conectar agente de Telegram
   */
  async connectTelegramAgent(agentId: string): Promise<void> {
    try {
      console.log('🔌 [TELEGRAM-CONNECT] Conectando agente de Telegram:', agentId);
      
      const agentApi = await getApiClient();
      await agentApi.post(`/agents/telegram/${agentId}/connect`);
      
      console.log('✅ [TELEGRAM-CONNECT] Agente conectado exitosamente');
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-CONNECT] Error conectando agente:', error);
      throw error;
    }
  },

  /**
   * Desconectar agente de Telegram
   */
  async disconnectTelegramAgent(agentId: string): Promise<void> {
    try {
      console.log('🔌 [TELEGRAM-DISCONNECT] Desconectando agente de Telegram:', agentId);
      
      const agentApi = await getApiClient();
      await agentApi.post(`/agents/telegram/${agentId}/disconnect`);
      
      console.log('✅ [TELEGRAM-DISCONNECT] Agente desconectado exitosamente');
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-DISCONNECT] Error desconectando agente:', error);
      throw error;
    }
  },

  /**
   * Obtener el botToken de un agente de Telegram
   */
  async getTelegramBotToken(agentId: string): Promise<string> {
    try {
      console.log('🔑 [TELEGRAM-TOKEN] Obteniendo botToken para agente:', agentId);
      
      const agentApi = await getApiClient();
      const response = await agentApi.get(`/agents/telegram/${agentId}/bot-token`);
      
      console.log('✅ [TELEGRAM-TOKEN] BotToken obtenido exitosamente');
      return response.data.botToken;
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-TOKEN] Error obteniendo botToken:', error);
      throw error;
    }
  },

  /**
   * Obtener agente por name y plataforma (intenta endpoint específico y si no existe, filtra localmente)
   */
  async getAgentByNameAndPlatform(name: string, platform: 'whatsapp' | 'telegram', userId?: number): Promise<AgentResponse | null> {
    try {
      const agentApi = await getApiClient();
      // Intentar un endpoint de búsqueda en el backend
      try {
        const url = `/agents/search?name=${encodeURIComponent(name)}&platform=${encodeURIComponent(platform)}`;
        const response = await agentApi.get(url);
        if (response.data && response.data.success && response.data.data) {
          // Si backend devuelve un único agente en data
          const agentData = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
          return agentData || null;
        }
      } catch (err) {
        // Si falla, lo ignoramos y caemos al fallback de filtrar localmente
        console.debug('No hay endpoint search disponible o falló. Fallback a getAgentsByUser.', err);
      }

      // Fallback: obtener todos los agentes del usuario (si userId provisto), o todos los agentes y filtrar
      if (typeof userId === 'number') {
        const agentsResp = await this.getAgentsByUser(userId);
        const agentsArray = agentsResp.data || agentsResp.agents || [];
        const matched = (agentsArray as AgentResponse[]).find(a => a.name === name && a.platform === platform);
        return matched || null;
      } else {
        const allResp = await this.getAgents();
        const agentsArray = allResp.data || allResp.agents || [];
        const matched = (agentsArray as AgentResponse[]).find(a => a.name === name && a.platform === platform);
        return matched || null;
      }
    } catch (error) {
      console.error('Error en getAgentByNameAndPlatform:', error);
      return null;
    }
  },
};

/**
 * Función para mapear AgentResponse a Agent (tipo del frontend)
 */
export function mapAgentResponseToAgent(agentResponse: AgentResponse): Agent {
  console.log('🔄 [MAPPING] Iniciando mapeo de AgentResponse a Agent');
  console.log('🔄 [MAPPING] AgentResponse completo recibido:', agentResponse);
  console.log('🔄 [MAPPING] Campo prompt del backend:', agentResponse.prompt);
  console.log('🔄 [MAPPING] Mapeando AgentResponse a Agent:', {
    id: agentResponse.id,
    name: agentResponse.name,
    sessionName: agentResponse.sessionName,
    prompt: agentResponse.prompt,
    platformConfig: agentResponse.platformConfig
  });

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

  // 🔧 PARSED PLATFORM CONFIG: Procesar platformConfig del backend si existe
  let parsedPlatformConfig: string | WhatsAppPlatformConfig | null = null;
  if (agentResponse.platformConfig) {
    try {
      parsedPlatformConfig = typeof agentResponse.platformConfig === 'string' 
        ? JSON.parse(agentResponse.platformConfig) 
        : agentResponse.platformConfig;
      console.log('🔄 [MAPPING] platformConfig parseado del backend:', parsedPlatformConfig);
    } catch (error) {
      console.warn('⚠️ [MAPPING] Error parsing platformConfig from backend:', error);
    }
  }

  const mappedAgent: Agent = {
    id: agentResponse.id, // Ya es string (UUID)
    name: agentResponse.name,
    description: agentResponse.description,
    platform: agentResponse.platform,
    status: agentResponse.status,
    // 🎯 FIX CRÍTICO: Agregar prompt directamente del backend
    prompt: agentResponse.prompt,
    // 🎯 FIX CRÍTICO: Agregar sessionName directamente del backend  
    sessionName: agentResponse.sessionName,
    // 🎯 FIX CRÍTICO: Usar sessionName del backend, NO generar uno fake
    workflowId: agentResponse.sessionName || `wf_${agentResponse.id}`, // Fallback solo si no existe
    // 🎯 FIX CRÍTICO: Incluir platformConfig del backend
    platformConfig: parsedPlatformConfig,
    lastExecution: agentResponse.lastExecutionAt ? new Date(agentResponse.lastExecutionAt) : new Date(agentResponse.updatedAt),
    totalExecutions: agentResponse.totalExecutions || 0,
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

  console.log('✅ [MAPPING] Agent mapeado completado:', {
    id: mappedAgent.id,
    name: mappedAgent.name,
    prompt: mappedAgent.prompt,
    sessionName: mappedAgent.sessionName,
    workflowId: mappedAgent.workflowId,
    platformConfig: mappedAgent.platformConfig
  });

  return mappedAgent;
}

export default agentService;
