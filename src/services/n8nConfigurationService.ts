// N8n Configuration Service
export interface N8nConfiguration {
  id: number;
  n8nUrl: string;
  webhookBase: string;
  apiBase: string;
  isActive: boolean;
  lastTestDate?: string;
  lastTestStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nConfigurationRequest {
  n8nUrl: string;
  apiKey?: string;
}

export interface N8nTestConnectionRequest {
  n8nUrl: string;
  apiKey?: string;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface TestConnectionResponse {
  status: 'success' | 'error';
  message: string;
  server: string;
  timestamp: string;
  response?: Record<string, unknown>;
}

class N8nConfigurationService {
  private readonly baseURL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8080');
  
  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Save N8n configuration
   */
  async saveConfiguration(config: N8nConfigurationRequest): Promise<ApiResponse<N8nConfiguration>> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/config`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving N8n configuration:', error);
      throw error;
    }
  }

  /**
   * Get active N8n configuration
   */
  async getActiveConfiguration(): Promise<ApiResponse<N8nConfiguration | null>> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/config`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting N8n configuration:', error);
      throw error;
    }
  }

  /**
   * Get all N8n configurations
   */
  async getAllConfigurations(): Promise<ApiResponse<N8nConfiguration[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/config/all`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting all N8n configurations:', error);
      throw error;
    }
  }

  /**
   * Test connection to N8n instance
   */
  async testConnection(config: N8nTestConnectionRequest): Promise<TestConnectionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/test-connection`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error testing N8n connection:', error);
      throw error;
    }
  }

  /**
   * Delete N8n configuration
   */
  async deleteConfiguration(configId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/config/${configId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting N8n configuration:', error);
      throw error;
    }
  }

  /**
   * Activate N8n configuration
   */
  async activateConfiguration(configId: number): Promise<ApiResponse<N8nConfiguration>> {
    try {
      const response = await fetch(`${this.baseURL}/api/n8n/config/${configId}/activate`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error activating N8n configuration:', error);
      throw error;
    }
  }

  /**
   * Validate N8n URL format
   */
  validateN8nUrl(url: string): { isValid: boolean; message?: string } {
    try {
      const parsedUrl = new URL(url);
      
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          message: 'URL must use HTTP or HTTPS protocol'
        };
      }

      if (!parsedUrl.hostname) {
        return {
          isValid: false,
          message: 'URL must have a valid hostname'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        message: 'Invalid URL format'
      };
    }
  }

  /**
   * Get webhook URL for a configuration
   */
  getWebhookUrl(n8nUrl: string, webhookPath: string): string {
    const baseUrl = n8nUrl.endsWith('/') ? n8nUrl.slice(0, -1) : n8nUrl;
    const path = webhookPath.startsWith('/') ? webhookPath : `/${webhookPath}`;
    return `${baseUrl}/webhook${path}`;
  }

  /**
   * Get API URL for a configuration
   */
  getApiUrl(n8nUrl: string, apiPath: string): string {
    const baseUrl = n8nUrl.endsWith('/') ? n8nUrl.slice(0, -1) : n8nUrl;
    const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
    return `${baseUrl}/api/v1${path}`;
  }
}

export const n8nConfigurationService = new N8nConfigurationService();
