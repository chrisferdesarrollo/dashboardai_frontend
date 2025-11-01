import axios from 'axios';
import configService from './configService';

export interface AgentTemplate {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  userId?: number;
  username?: string;
}

export interface CreateAgentTemplateRequest {
  name: string;
  description?: string;
  systemPrompt: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  isActive?: boolean;
}

export interface UpdateAgentTemplateRequest {
  name: string;
  description?: string;
  systemPrompt: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
  isActive?: boolean;
}

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

const agentTemplateApi = {
  // Obtener todos los templates
  getAll: async (): Promise<AgentTemplate[]> => {
    const api = await getApiClient();
    const response = await api.get<AgentTemplate[]>('/agent-templates');
    return response.data;
  },

  // Obtener templates activos
  getActive: async (): Promise<AgentTemplate[]> => {
    const api = await getApiClient();
    const response = await api.get<AgentTemplate[]>('/agent-templates/active');
    return response.data;
  },

  // Obtener template por ID
  getById: async (id: string): Promise<AgentTemplate> => {
    const api = await getApiClient();
    const response = await api.get<AgentTemplate>(`/agent-templates/${id}`);
    return response.data;
  },

  // Crear nuevo template
  create: async (data: CreateAgentTemplateRequest): Promise<AgentTemplate> => {
    const api = await getApiClient();
    const response = await api.post<AgentTemplate>('/agent-templates', data);
    return response.data;
  },

  // Actualizar template
  update: async (id: string, data: UpdateAgentTemplateRequest): Promise<AgentTemplate> => {
    const api = await getApiClient();
    const response = await api.put<AgentTemplate>(`/agent-templates/${id}`, data);
    return response.data;
  },

  // Eliminar template
  delete: async (id: string): Promise<void> => {
    const api = await getApiClient();
    await api.delete(`/agent-templates/${id}`);
  },
};

export default agentTemplateApi;
