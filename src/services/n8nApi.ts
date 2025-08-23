import axios from 'axios';
import { Agent, AgentExecution, CreateAgentInput, UpdateAgentInput } from '@/types/agent';

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

// Configuración de la API de n8n
const N8N_API_URL = import.meta.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_TOKEN = import.meta.env.VITE_N8N_API_TOKEN || '';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

console.log('n8n Config:', {
  N8N_API_URL,
  N8N_WEBHOOK_URL,
  hasToken: !!N8N_API_TOKEN
});

const api = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'Authorization': `Bearer ${N8N_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Cliente específico para webhooks (no requiere autenticación)
const webhookApi = axios.create({
  baseURL: N8N_WEBHOOK_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en API n8n:', error);
    throw error;
  }
);

export const n8nApi = {
  // Gestión de workflows (agentes)
  async getWorkflows(): Promise<N8nWorkflow[]> {
    const response = await api.get('/workflows');
    return response.data.data || [];
  },

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const response = await api.post('/workflows', workflow);
    return response.data;
  },

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const response = await api.put(`/workflows/${id}`, workflow);
    return response.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  async activateWorkflow(id: string): Promise<void> {
    await api.post(`/workflows/${id}/activate`);
  },

  async deactivateWorkflow(id: string): Promise<void> {
    await api.post(`/workflows/${id}/deactivate`);
  },

  // Ejecuciones
  async executeWorkflow(id: string, input?: Record<string, unknown>): Promise<N8nExecution> {
    const response = await api.post(`/workflows/${id}/execute`, input);
    return response.data;
  },

  async getExecutions(workflowId?: string): Promise<N8nExecution[]> {
    const params = workflowId ? { workflowId } : {};
    const response = await api.get('/executions', { params });
    return response.data.data || [];
  },

  async getExecution(id: string): Promise<N8nExecution> {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },

  async deleteExecution(id: string): Promise<void> {
    await api.delete(`/executions/${id}`);
  },

  // Logs en tiempo real (usar con WebSocket en el futuro)
  async getExecutionLogs(executionId: string): Promise<Record<string, unknown>[]> {
    try {
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
      
      console.log('Calling n8n webhook:', {
        baseURL: N8N_WEBHOOK_URL,
        url,
        fullURL: `${N8N_WEBHOOK_URL}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('n8n webhook response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error creando sesión WhatsApp:', error);
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
      
      console.log('Checking WhatsApp status:', {
        baseURL: N8N_WEBHOOK_URL,
        url,
        fullURL: `${N8N_WEBHOOK_URL}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('WhatsApp status response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error verificando estado WhatsApp:', error);
      if (error instanceof Error) {
        throw new Error(`No se pudo verificar el estado de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo verificar el estado de WhatsApp');
    }
  },

  // WhatsApp - Eliminar sesión
  async deleteWhatsAppSession(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      const url = '/delete-whatsapp-session';
      const payload = { sessionName };
      
      console.log('Deleting WhatsApp session:', {
        baseURL: N8N_WEBHOOK_URL,
        url,
        fullURL: `${N8N_WEBHOOK_URL}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('WhatsApp delete response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error eliminando sesión WhatsApp:', error);
      if (error instanceof Error) {
        throw new Error(`No se pudo eliminar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo eliminar la sesión de WhatsApp');
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