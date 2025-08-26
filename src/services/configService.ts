// Servicio para manejar configuraciones de la aplicación

export interface N8nConfig {
  webhookUrl: string;
  apiUrl: string;
  apiToken: string;
}

export interface BackendConfig {
  apiUrl: string;
}

export interface AppConfig {
  n8n: N8nConfig;
  backend: BackendConfig;
}

export interface ConfigurationResponse {
  id: number;
  key: string;
  value: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurationRequest {
  key: string;
  value: string;
  description?: string;
}

class ConfigService {
  private readonly CONFIG_KEY = 'dashboardai_config';
  private readonly N8N_TOKEN_KEY = 'n8n_api_token';
  
  // Obtener URL base del backend
  private getBackendUrl(): string {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  }

  // Obtener token de autenticación
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  // Headers para las peticiones autenticadas
  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  /**
   * Obtiene la configuración completa desde el backend
   */
  async getConfig(): Promise<AppConfig> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/configuration/n8n/config`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const n8nConfig = await response.json();
      
      return {
        n8n: {
          webhookUrl: n8nConfig.webhookUrl || '',
          apiUrl: n8nConfig.apiUrl || '',
          apiToken: n8nConfig.apiToken === '***' ? '' : n8nConfig.apiToken || '',
        },
        backend: {
          apiUrl: this.getBackendUrl(),
        },
      };
    } catch (error) {
      console.warn('Error loading config from backend, using fallback:', error);
      return this.getFallbackConfig();
    }
  }

  /**
   * Configuración de respaldo si no se puede conectar al backend
   */
  private getFallbackConfig(): AppConfig {
    const savedConfig = localStorage.getItem(this.CONFIG_KEY);
    
    const defaultConfig: AppConfig = {
      n8n: {
        webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || '',
        apiUrl: import.meta.env.VITE_N8N_API_URL || '',
        apiToken: localStorage.getItem(this.N8N_TOKEN_KEY) || import.meta.env.VITE_N8N_API_TOKEN || '',
      },
      backend: {
        apiUrl: this.getBackendUrl(),
      },
    };

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return this.mergeConfigs(defaultConfig, parsed);
      } catch (error) {
        console.error('Error parsing saved config:', error);
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  /**
   * Guarda la configuración en el backend
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      // Guardar configuración de n8n en el backend
      await fetch(`${this.getBackendUrl()}/configuration/n8n/config`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          webhookUrl: config.n8n.webhookUrl,
          apiUrl: config.n8n.apiUrl,
          apiToken: config.n8n.apiToken,
        }),
      });

      // También guardar en localStorage como respaldo
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
      
      // Guardar token de n8n por separado para facilidad de acceso
      if (config.n8n.apiToken) {
        localStorage.setItem(this.N8N_TOKEN_KEY, config.n8n.apiToken);
      }
    } catch (error) {
      console.error('Error saving config to backend, saving locally:', error);
      // Si falla el backend, al menos guardar localmente
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
      if (config.n8n.apiToken) {
        localStorage.setItem(this.N8N_TOKEN_KEY, config.n8n.apiToken);
      }
      throw new Error('No se pudo guardar la configuración en el servidor');
    }
  }

  /**
   * Obtiene solo la configuración de n8n
   */
  async getN8nConfig(): Promise<N8nConfig> {
    const config = await this.getConfig();
    return config.n8n;
  }

  /**
   * Obtiene solo la configuración del backend
   */
  async getBackendConfig(): Promise<BackendConfig> {
    console.log('🔧 ConfigService.getBackendConfig() iniciado');
    const config = await this.getConfig();
    console.log('🔧 Configuración del backend obtenida:', config.backend);
    return config.backend;
  }

  /**
   * Obtiene la URL del webhook de n8n
   */
  async getN8nWebhookUrl(): Promise<string> {
    try {
      const response = await fetch(`${this.getBackendUrl()}/configuration/n8n/webhook-url`, {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('Error getting webhook URL from backend:', error);
    }
    
    // Fallback a localStorage
    const config = await this.getN8nConfig();
    return config.webhookUrl;
  }

  /**
   * Obtiene la URL de la API de n8n
   */
  async getN8nApiUrl(): Promise<string> {
    const config = await this.getN8nConfig();
    return config.apiUrl;
  }

  /**
   * Obtiene el token de n8n
   */
  async getN8nApiToken(): Promise<string> {
    const config = await this.getN8nConfig();
    return config.apiToken;
  }

  /**
   * Obtiene la URL del backend
   */
  async getBackendApiUrl(): Promise<string> {
    const config = await this.getBackendConfig();
    return config.apiUrl;
  }

  /**
   * Construye la URL completa del webhook para un workflow específico
   */
  async buildWebhookUrl(workflowId: string): Promise<string> {
    const baseUrl = await this.getN8nWebhookUrl();
    if (!baseUrl) {
      throw new Error('URL del webhook de n8n no configurada');
    }
    
    // Remover slash final si existe
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    
    // Agregar el ID del workflow
    return `${cleanBaseUrl}/${workflowId}`;
  }

  /**
   * Prueba la conexión con n8n
   */
  async testN8nConnection(): Promise<boolean> {
    const config = await this.getN8nConfig();
    
    if (!config.apiUrl || !config.apiToken) {
      throw new Error('Configuración de n8n incompleta');
    }

    try {
      const response = await fetch(`${config.apiUrl}/workflows`, {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing n8n connection:', error);
      return false;
    }
  }

  /**
   * Resetea la configuración a valores por defecto
   */
  resetConfig(): void {
    localStorage.removeItem(this.CONFIG_KEY);
    localStorage.removeItem(this.N8N_TOKEN_KEY);
  }

  /**
   * Combina configuraciones dando prioridad a la configuración guardada
   */
  private mergeConfigs(defaultConfig: AppConfig, savedConfig: Partial<AppConfig>): AppConfig {
    return {
      n8n: {
        ...defaultConfig.n8n,
        ...savedConfig.n8n,
      },
      backend: {
        ...defaultConfig.backend,
        ...savedConfig.backend,
      },
    };
  }

  /**
   * Valida que la configuración esté completa
   */
  validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.n8n.webhookUrl) {
      errors.push('URL del webhook de n8n es requerida');
    }

    if (!config.backend.apiUrl) {
      errors.push('URL del backend es requerida');
    }

    // Validar formato de URLs
    try {
      if (config.n8n.webhookUrl) new URL(config.n8n.webhookUrl);
    } catch {
      errors.push('URL del webhook de n8n no es válida');
    }

    try {
      if (config.n8n.apiUrl) new URL(config.n8n.apiUrl);
    } catch {
      errors.push('URL de la API de n8n no es válida');
    }

    try {
      if (config.backend.apiUrl) new URL(config.backend.apiUrl);
    } catch {
      errors.push('URL del backend no es válida');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Instancia singleton
export const configService = new ConfigService();

// Export por defecto para facilidad de uso
export default configService;
