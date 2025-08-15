import axios from 'axios';
import { Agent, AgentExecution, CreateAgentInput, UpdateAgentInput } from '@/types/agent';

// Configuración de la API de n8n
const N8N_API_URL = import.meta.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_TOKEN = import.meta.env.VITE_N8N_API_TOKEN || '';

const api = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'Authorization': `Bearer ${N8N_API_TOKEN}`,
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
  async getWorkflows(): Promise<any[]> {
    const response = await api.get('/workflows');
    return response.data.data || [];
  },

  async getWorkflow(id: string): Promise<any> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(workflow: any): Promise<any> {
    const response = await api.post('/workflows', workflow);
    return response.data;
  },

  async updateWorkflow(id: string, workflow: any): Promise<any> {
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
  async executeWorkflow(id: string, input?: any): Promise<any> {
    const response = await api.post(`/workflows/${id}/execute`, input);
    return response.data;
  },

  async getExecutions(workflowId?: string): Promise<any[]> {
    const params = workflowId ? { workflowId } : {};
    const response = await api.get('/executions', { params });
    return response.data.data || [];
  },

  async getExecution(id: string): Promise<any> {
    const response = await api.get(`/executions/${id}`);
    return response.data;
  },

  async deleteExecution(id: string): Promise<void> {
    await api.delete(`/executions/${id}`);
  },

  // Logs en tiempo real (usar con WebSocket en el futuro)
  async getExecutionLogs(executionId: string): Promise<any[]> {
    try {
      const response = await api.get(`/executions/${executionId}`);
      // Extraer logs de la respuesta de ejecución
      return response.data.data?.resultData?.runData || [];
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
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