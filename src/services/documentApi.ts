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

export interface DocumentUploadRequest {
  file: File;
  name: string;
  description?: string;
  tags?: string[];
  agentId?: string;
}

export interface DocumentResponse {
  id: string;
  name: string;
  description?: string;
  fileType: string;
  tags?: string[];
  agentId?: string;
  uploadDate: string;
  processed: boolean;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadResponse {
  id?: string;
  message: string;
  status: string;
  document?: DocumentResponse;
}

export interface DocumentStats {
  total: number;
  processed: number;
  pending: number;
  failed: number;
  successRate: number;
}

export interface UpdateDocumentRequest {
  name?: string;
  description?: string;
  tags?: string[];
  agentId?: string;
}

export interface PagedDocumentsResponse {
  content: DocumentResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

class DocumentApi {
  /**
   * Subir un nuevo documento
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    const client = await getApiClient();
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('name', request.name);
    
    if (request.description) {
      formData.append('description', request.description);
    }
    
    if (request.tags && request.tags.length > 0) {
      request.tags.forEach(tag => formData.append('tags', tag));
    }
    
    if (request.agentId) {
      formData.append('agentId', request.agentId);
    }

    const response = await client.post(
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Obtener todos los documentos (sin paginación)
   */
  async getAllDocuments(): Promise<DocumentResponse[]> {
    const client = await getApiClient();
    const response = await client.get('/documents');
    return response.data;
  }

  /**
   * Obtener documento por ID
   */
  async getDocumentById(id: string): Promise<DocumentResponse> {
    const client = await getApiClient();
    const response = await client.get(`/documents/${id}`);
    return response.data;
  }

  /**
   * Obtener documentos por agente
   */
  async getDocumentsByAgent(agentId: string): Promise<DocumentResponse[]> {
    const client = await getApiClient();
    const response = await client.get(`/documents/agent/${agentId}`);
    return response.data;
  }

  /**
   * Buscar documentos por término
   */
  async searchDocuments(query: string): Promise<DocumentResponse[]> {
    const client = await getApiClient();
    const response = await client.get('/documents/search', {
      params: { query },
    });
    return response.data;
  }
  /**
   * Obtener documentos por tag
   */
  async getDocumentsByTag(tag: string): Promise<DocumentResponse[]> {
    const client = await getApiClient();
    const response = await client.get(`/documents/tag/${tag}`);
    return response.data;
  }

  /**
   * Actualizar metadatos del documento
   */
  async updateDocument(id: string, request: UpdateDocumentRequest): Promise<DocumentResponse> {
    const client = await getApiClient();
    const response = await client.put(`/documents/${id}`, request);
    return response.data;
  }

  /**
   * Eliminar documento
   */
  async deleteDocument(id: string): Promise<{ message: string }> {
    const client = await getApiClient();
    const response = await client.delete(`/documents/${id}`);
    return response.data;
  }

  /**
   * Obtener estadísticas de documentos
   */
  async getDocumentStats(): Promise<DocumentStats> {
    const client = await getApiClient();
    const response = await client.get('/documents/stats');
    return response.data;
  }

  /**
   * Actualizar estado de procesamiento (para uso interno/N8N)
   */
  async updateProcessingStatus(id: string, status: string): Promise<{ message: string }> {
    const client = await getApiClient();
    const response = await client.put(`/documents/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  }
}

// Exportar instancia singleton
export const documentApi = new DocumentApi();
export default documentApi;