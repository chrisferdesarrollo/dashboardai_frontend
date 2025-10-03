import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
  originalFilename: string;
  fileType: string;
  fileSize: number;
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
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Subir un nuevo documento
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
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

    const response = await axios.post(
      `${API_BASE_URL}/documents/upload`,
      formData,
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Obtener todos los documentos con paginación
   */
  async getAllDocuments(page: number = 0, size: number = 20): Promise<PagedDocumentsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/documents`,
      {
        params: { page, size },
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Obtener documento por ID
   */
  async getDocumentById(id: string): Promise<DocumentResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/documents/${id}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Obtener documentos por agente
   */
  async getDocumentsByAgent(agentId: string): Promise<DocumentResponse[]> {
    const response = await axios.get(
      `${API_BASE_URL}/documents/agent/${agentId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Buscar documentos por término
   */
  async searchDocuments(query: string): Promise<DocumentResponse[]> {
    const response = await axios.get(
      `${API_BASE_URL}/documents/search`,
      {
        params: { query },
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Obtener documentos por tag
   */
  async getDocumentsByTag(tag: string): Promise<DocumentResponse[]> {
    const response = await axios.get(
      `${API_BASE_URL}/documents/tag/${tag}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Actualizar metadatos del documento
   */
  async updateDocument(id: string, request: UpdateDocumentRequest): Promise<DocumentResponse> {
    const response = await axios.put(
      `${API_BASE_URL}/documents/${id}`,
      request,
      {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  /**
   * Eliminar documento
   */
  async deleteDocument(id: string): Promise<{ message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/documents/${id}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Obtener estadísticas de documentos
   */
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await axios.get(
      `${API_BASE_URL}/documents/stats`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }

  /**
   * Actualizar estado de procesamiento (para uso interno/N8N)
   */
  async updateProcessingStatus(id: string, status: string): Promise<{ message: string }> {
    const response = await axios.put(
      `${API_BASE_URL}/documents/${id}/status`,
      null,
      {
        params: { status },
        headers: this.getAuthHeaders(),
      }
    );

    return response.data;
  }
}

// Exportar instancia singleton
export const documentApi = new DocumentApi();
export default documentApi;