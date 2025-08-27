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

// Tipos para TypeScript
export interface WorkflowUploadRequest {
  name: string;
  description?: string;
  workflowJson: string;
  activate?: boolean;
}

export interface WorkflowResponse {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodeCount: string;
  createdAt: string;
  updatedAt: string;
  tags: string;
  workflowJson: string;
}

export interface WorkflowApiResponse {
  success: boolean;
  data?: WorkflowResponse;
  error?: string;
}

export interface WorkflowListApiResponse {
  success: boolean;
  data?: WorkflowResponse[];
  error?: string;
}

export const workflowService = {
  /**
   * Subir workflow desde archivo
   */
  async uploadWorkflowFile(file: File, name?: string, description?: string): Promise<WorkflowApiResponse> {
    try {
      console.log('Uploading workflow file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      if (name) formData.append('name', name);
      if (description) formData.append('description', description);
      
      const apiClient = await getApiClient();
      
      // Crear cliente con multipart/form-data headers
      const response = await apiClient.post('/workflows/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Workflow file upload response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error uploading workflow file:', error);
      
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
   * Crear workflow desde JSON
   */
  async createWorkflow(workflowData: WorkflowUploadRequest): Promise<WorkflowApiResponse> {
    try {
      console.log('Creating workflow:', workflowData.name);
      
      const apiClient = await getApiClient();
      const response = await apiClient.post('/workflows/create', workflowData);
      
      console.log('Workflow creation response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error creating workflow:', error);
      
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
   * Obtener todos los workflows
   */
  async getWorkflows(): Promise<WorkflowListApiResponse> {
    try {
      console.log('Fetching all workflows');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/workflows');
      
      console.log('Workflows fetch response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error fetching workflows:', error);
      return {
        success: false,
        error: 'Error al obtener los workflows'
      };
    }
  },

  /**
   * Obtener workflow por ID
   */
  async getWorkflowById(id: string): Promise<WorkflowApiResponse> {
    try {
      console.log('Fetching workflow by ID:', id);
      
      const apiClient = await getApiClient();
      const response = await apiClient.get(`/workflows/${id}`);
      
      console.log('Workflow fetch response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error fetching workflow:', error);
      return {
        success: false,
        error: 'Error al obtener el workflow'
      };
    }
  },

  /**
   * Activar workflow
   */
  async activateWorkflow(id: string): Promise<WorkflowApiResponse> {
    try {
      console.log('Activating workflow:', id);
      
      const apiClient = await getApiClient();
      const response = await apiClient.post(`/workflows/${id}/activate`);
      
      console.log('Workflow activation response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error activating workflow:', error);
      return {
        success: false,
        error: 'Error al activar el workflow'
      };
    }
  },

  /**
   * Desactivar workflow
   */
  async deactivateWorkflow(id: string): Promise<WorkflowApiResponse> {
    try {
      console.log('Deactivating workflow:', id);
      
      const apiClient = await getApiClient();
      const response = await apiClient.post(`/workflows/${id}/deactivate`);
      
      console.log('Workflow deactivation response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error deactivating workflow:', error);
      return {
        success: false,
        error: 'Error al desactivar el workflow'
      };
    }
  },

  /**
   * Eliminar workflow
   */
  async deleteWorkflow(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Deleting workflow:', id);
      
      const apiClient = await getApiClient();
      const response = await apiClient.delete(`/workflows/${id}`);
      
      console.log('Workflow deletion response:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      console.error('Error deleting workflow:', error);
      return {
        success: false,
        error: 'Error al eliminar el workflow'
      };
    }
  },
};
