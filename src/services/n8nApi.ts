import axios from 'axios';
import { Agent, AgentExecution, CreateAgentInput, UpdateAgentInput } from '@/types/agent';
import configService from './configService';

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
    baseURL: config.apiUrl || 'http://localhost:8443/api/v1',
    headers: {
      'Authorization': config.apiToken ? `Bearer ${config.apiToken}` : '',
      'Content-Type': 'application/json',
    },
  });
};

const createWebhookClient = async () => {
  const config = await getN8nConfig();
  return axios.create({
    baseURL: config.webhookUrl || 'http://localhost:8443/webhook',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Instancias que se recrean en cada uso para obtener la configuración más reciente
const getApiClient = () => createApiClient();
const getWebhookClient = () => createWebhookClient();

export const n8nApi = {
  // Este objeto puede contener funciones específicas de n8n en el futuro
  // Por ahora, las funciones de WhatsApp se han movido a whatsappApi.ts
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
      prompt: 'Eres un asistente virtual especializado en atención al cliente.',
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
      prompt: 'Analiza el sentimiento del siguiente texto de manera objetiva y profesional.',
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
      prompt: 'Genera contenido creativo y atractivo para redes sociales siguiendo las mejores prácticas.',
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