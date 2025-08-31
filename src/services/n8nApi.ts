import axios from 'axios';
import { Agent, AgentExecution, CreateAgentInput, UpdateAgentInput } from '@/types/agent';
import configService from './configService';

// Tipos para WhatsApp
interface WhatsAppSessionRequest {
  sessionName: string;
}

interface WhatsAppSessionResponse {
  success: boolean;
  sessionName: string;
  base64?: string;
  timestamp: string;
  user: string;
  error?: string;
}

interface WhatsAppStatusResponse {
  success: boolean;
  sessionName: string;
  isConnected?: boolean;
  connected?: boolean;  // Agregar compatibilidad con ambos nombres
  status?: string;
  timestamp: string;
}

interface WhatsAppDeleteResponse {
  success: boolean;
  sessionName: string;
  message: string;
  timestamp: string;
}

// Tipos para n8n workflows
interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface N8nNode {
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  data?: N8nExecutionData;
}

interface N8nExecutionData {
  resultData: {
    runData: Record<string, unknown>;
  };
}

// Funciones para obtener configuración dinámica
const getN8nConfig = async () => configService.getN8nConfig();

// Crear instancias de axios que se actualizan dinámicamente
const createApiClient = async () => {
  const config = await getN8nConfig();
  return axios.create({
    baseURL: config.apiUrl || 'http://localhost:5678/api/v1',
    headers: {
      'Authorization': config.apiToken ? `Bearer ${config.apiToken}` : '',
      'Content-Type': 'application/json',
    },
  });
};

const createWebhookClient = async () => {
  const config = await getN8nConfig();
  return axios.create({
    baseURL: config.webhookUrl || 'http://localhost:5678/webhook',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Instancias que se recrean en cada uso para obtener la configuración más reciente
const getApiClient = () => createApiClient();
const getWebhookClient = () => createWebhookClient();

export const n8nApi = {
  // Test connection to n8n VPS
  async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const config = await getN8nConfig();
      const testUrl = `${config.webhookUrl}/test-connection`;
      
      console.log('🔍 Testing connection to n8n VPS:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test connection from Dashboard',
          timestamp: new Date().toISOString(),
          source: 'dashboard-frontend'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Connection test successful:', data);
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error de conexión desconocido' 
      };
    }
  },

  // Obtener workflows desde n8n API
  async getN8nWorkflows(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const config = await getN8nConfig();
      const apiClient = await getApiClient();
      
      console.log('🔍 Fetching workflows from n8n API:', config.apiUrl);
      
      const response = await apiClient.get('/workflows');
      
      console.log('✅ Workflows fetched successfully:', response.data);
      return { success: true, data: response.data.data || [] };
      
    } catch (error) {
      console.error('❌ Error fetching workflows:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al obtener workflows' 
      };
    }
  },
  // Gestión de workflows (agentes)
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const api = await getApiClient();
    const response = await api.get('/workflows');
    return response.data.data || [];
  },

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    const api = await getApiClient();
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const api = await getApiClient();
    const response = await api.post('/workflows', workflow);
    return response.data;
  },

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const api = await getApiClient();
    const response = await api.put(`/workflows/${id}`, workflow);
    return response.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    const api = await getApiClient();
    await api.delete(`/workflows/${id}`);
  },

  async activateWorkflow(id: string): Promise<void> {
    const api = await getApiClient();
    await api.post(`/workflows/${id}/activate`);
  },

  async deactivateWorkflow(id: string): Promise<void> {
    const api = await getApiClient();
    await api.post(`/workflows/${id}/deactivate`);
  },

  // Ejecuciones
  async executeWorkflow(id: string, input?: Record<string, unknown>): Promise<N8nExecution> {
    const api = await getApiClient();
    const response = await api.post(`/workflows/${id}/execute`, input);
    return response.data;
  },

  async getExecutions(workflowId?: string): Promise<N8nExecution[]> {
    const api = await getApiClient();
    const params = workflowId ? { workflowId } : {};
    const response = await api.get('/executions', { params });
    return response.data.data || [];
  },

  async getExecution(id: string): Promise<N8nExecution> {
    const api = await getApiClient();
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },

  async deleteExecution(id: string): Promise<void> {
    const api = await getApiClient();
    await api.delete(`/executions/${id}`);
  },

  // Logs en tiempo real (usar con WebSocket en el futuro)
  async getExecutionLogs(executionId: string): Promise<Record<string, unknown>[]> {
    try {
      const api = await getApiClient();
      const response = await api.get(`/executions/${executionId}`);
      // Extraer logs de la respuesta de ejecución
      return response.data.data?.resultData?.runData || [];
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
    }
  },

  // WhatsApp - Crear sesión y obtener QR
  async createWhatsAppSession(sessionName: string): Promise<WhatsAppSessionResponse> {
    try {
      const url = '/create-whatsapp-session';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      console.log('Calling n8n webhook:', {
        baseURL: config.webhookUrl,
        url,
        fullURL: `${config.webhookUrl}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('n8n webhook response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error creando sesión WhatsApp:', error);
      
      // Implementación temporal para desarrollo
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando respuesta de WhatsApp QR');
        const webhookConfig = await getN8nConfig();
        
        // QR code simulado más realista (representa un texto de ejemplo)
        const mockQrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIoAAACKCAYAAABdotmlAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8yOC8yNJqMGD0AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAKElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAgGcDQAABAAJgywOYPAAAAABJRU5ErkJggg==';
        
        return {
          success: true,
          sessionName,
          base64: mockQrBase64,
          timestamp: new Date().toISOString(),
          user: 'development_user'
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo crear la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo crear la sesión de WhatsApp');
    }
  },

  // WhatsApp - Verificar estado de conexión
  async checkWhatsAppStatus(sessionName: string): Promise<WhatsAppStatusResponse> {
    try {
      const url = '/check-whatsapp-status';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      console.log('Checking WhatsApp status:', {
        baseURL: config.webhookUrl,
        url,
        fullURL: `${config.webhookUrl}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('WhatsApp status response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error verificando estado WhatsApp:', error);
      
      // Implementación temporal para desarrollo
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando estado de WhatsApp');
        return {
          success: true,
          sessionName,
          isConnected: false,
          connected: false,
          status: 'waiting_for_connection',
          timestamp: new Date().toISOString()
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo verificar el estado de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo verificar el estado de WhatsApp');
    }
  },

  // WhatsApp - Eliminar sesión
  async deleteWhatsAppSession(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      console.log('🚨 [N8N-DELETE] Iniciando eliminación de sesión WhatsApp:', sessionName);
      
      const url = '/delete-whatsapp-session';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-DELETE] Configuración de eliminación:', {
        sessionName,
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-DELETE] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-DELETE] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-DELETE] Error eliminando sesión WhatsApp:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-DELETE] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo eliminar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo eliminar la sesión de WhatsApp');
    }
  },

  // WhatsApp - Desconectar sesión (logout)
  async disconnectWhatsAppSession(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      console.log('🔌 [N8N-DISCONNECT] Iniciando desconexión de sesión WhatsApp:', sessionName);
      
      const url = '/delete-whatsapp-session'; // Usar el mismo webhook que hace logout-instance
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-DISCONNECT] Configuración de desconexión:', {
        sessionName,
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-DISCONNECT] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-DISCONNECT] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-DISCONNECT] Error desconectando sesión WhatsApp:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-DISCONNECT] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo desconectar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo desconectar la sesión de WhatsApp');
    }
  },
};

// Simulación de datos para desarrollo (remover en producción)
export const mockData = {
  agents: [
    {
      id: '1',
      name: 'Agente de Atención al Cliente',
      description: 'Responde consultas de clientes usando GPT-4',
      platform: 'whatsapp' as const,
      status: 'active' as const,
      workflowId: 'wf_1',
      lastExecution: new Date('2024-01-15T10:30:00'),
      totalExecutions: 156,
      settings: {
        apiKeys: { openai: '***' },
        prompts: { system: 'Eres un asistente de atención al cliente' },
        variables: { company: 'MiEmpresa' },
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Analizador de Sentimientos',
      description: 'Analiza el sentimiento de reviews de productos',
      platform: 'telegram' as const,
      status: 'inactive' as const,
      workflowId: 'wf_2',
      lastExecution: new Date('2024-01-14T15:20:00'),
      totalExecutions: 89,
      settings: {
        apiKeys: { huggingface: '***' },
        prompts: { analysis: 'Analiza el sentimiento del siguiente texto' },
        variables: { threshold: 0.8 },
      },
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-14'),
    },
    {
      id: '3',
      name: 'Generador de Contenido',
      description: 'Crea contenido para redes sociales',
      platform: 'whatsapp' as const,
      status: 'error' as const,
      workflowId: 'wf_3',
      lastExecution: new Date('2024-01-15T09:15:00'),
      totalExecutions: 45,
      settings: {
        apiKeys: { openai: '***' },
        prompts: { content: 'Genera contenido creativo para redes sociales' },
        variables: { platform: 'instagram', tone: 'casual' },
      },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-15'),
    },
  ] as Agent[],
};