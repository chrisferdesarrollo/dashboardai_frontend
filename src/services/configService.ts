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
    // Detectar si estamos en el VPS por la URL del navegador
    const isVPS = window.location.hostname === '148.230.92.75';
    
    let finalUrl;
    if (isVPS) {
      finalUrl = 'http://148.230.92.75:8080/api';
      console.log('🚀 [ConfigService] Detectado VPS, usando URL hardcodeada:', finalUrl);
    } else {
      finalUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
      console.log('🔧 [ConfigService] Usando configuración local:', finalUrl);
    }
    
    console.log('🔧 [ConfigService] getBackendUrl():', {
      hostname: window.location.hostname,
      isVPS: isVPS,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      finalUrl: finalUrl
    });
    return finalUrl;
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
   * Detecta si estamos en modo desarrollo local
   */
  private isLocalDevelopment(): boolean {
    const environment = import.meta.env.VITE_N8N_ENVIRONMENT;
    const forceLocal = import.meta.env.VITE_FORCE_LOCAL_N8N === 'true';
    
    return environment === 'local' || forceLocal ||
           (import.meta.env.DEV && 
           (import.meta.env.VITE_N8N_WEBHOOK_URL?.includes('localhost') || 
            import.meta.env.VITE_N8N_API_URL?.includes('localhost')));
  }

  /**
   * Obtiene la configuración de n8n según el entorno especificado
   */
  private getN8nConfigByEnvironment(): N8nConfig {
    const environment = import.meta.env.VITE_N8N_ENVIRONMENT || 'local';
    
    // Debug: mostrar todas las variables de entorno
    console.log('🔍 Debug - Variables de entorno:', {
      VITE_N8N_ENVIRONMENT: import.meta.env.VITE_N8N_ENVIRONMENT,
      VITE_FORCE_LOCAL_N8N: import.meta.env.VITE_FORCE_LOCAL_N8N,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      environment: environment
    });
    
    console.log(`🌍 Usando configuración de n8n para entorno: ${environment}`);
    
    if (environment === 'production') {
      return {
        webhookUrl: import.meta.env.VITE_N8N_PROD_WEBHOOK_URL || '',
        apiUrl: import.meta.env.VITE_N8N_PROD_API_URL || '',
        apiToken: import.meta.env.VITE_N8N_PROD_API_TOKEN || '',
      };
    } else {
      return {
        webhookUrl: import.meta.env.VITE_N8N_LOCAL_WEBHOOK_URL || 
                   import.meta.env.VITE_N8N_WEBHOOK_URL || '',
        apiUrl: import.meta.env.VITE_N8N_LOCAL_API_URL || 
               import.meta.env.VITE_N8N_API_URL || '',
        apiToken: import.meta.env.VITE_N8N_LOCAL_API_TOKEN || 
                 import.meta.env.VITE_N8N_API_TOKEN || '',
      };
    }
  }

  /**
   * Obtiene la configuración completa desde el backend
   */
  async getConfig(): Promise<AppConfig> {
    // Si estamos en desarrollo local, usar directamente las variables de entorno
    if (this.isLocalDevelopment()) {
      console.log('🚀 ConfigService.getConfig() - Modo desarrollo local detectado, usando variables de entorno');
      console.log('🔧 Variables de entorno:', {
        VITE_FORCE_LOCAL_N8N: import.meta.env.VITE_FORCE_LOCAL_N8N,
        VITE_N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL,
        VITE_N8N_API_URL: import.meta.env.VITE_N8N_API_URL,
        isDev: import.meta.env.DEV
      });
      return this.getFallbackConfig();
    }

    try {
      console.log('🔍 ConfigService.getConfig() - Intentando cargar configuración desde backend');
      console.log('🔍 Backend URL:', this.getBackendUrl());
      console.log('🔍 Auth token presente:', !!this.getAuthToken());
      
      const response = await fetch(`${this.getBackendUrl()}/configuration/n8n`, {
        headers: this.getAuthHeaders(),
      });

      console.log('🔍 Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const n8nConfig = await response.json();
      
      console.log('✅ Configuración obtenida desde backend:', {
        webhookUrl: n8nConfig.webhookUrl ? '✅ Presente' : '❌ Ausente',
        apiUrl: n8nConfig.apiUrl ? '✅ Presente' : '❌ Ausente',
        apiToken: n8nConfig.apiToken ? '✅ Presente' : '❌ Ausente'
      });
      
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
      console.warn('⚠️ Error loading config from backend, using fallback:', error);
      const fallbackConfig = this.getFallbackConfig();
      console.log('🔄 Using fallback config:', {
        n8n: {
          webhookUrl: fallbackConfig.n8n.webhookUrl ? '✅ Presente' : '❌ Ausente',
          apiUrl: fallbackConfig.n8n.apiUrl ? '✅ Presente' : '❌ Ausente',
          apiToken: fallbackConfig.n8n.apiToken ? '✅ Presente' : '❌ Ausente'
        }
      });
      return fallbackConfig;
    }
  }

  /**
   * Configuración de respaldo si no se puede conectar al backend
   */
  private getFallbackConfig(): AppConfig {
    console.log('🔄 ConfigService.getFallbackConfig() - Generando configuración de respaldo');
    
    const savedConfig = localStorage.getItem(this.CONFIG_KEY);
    
    // Configuración por defecto usando variables de entorno según el entorno
    const environment = import.meta.env.VITE_N8N_ENVIRONMENT || 'local';
    const n8nConfig = this.getN8nConfigByEnvironment();
    
    const defaultConfig: AppConfig = {
      n8n: {
        webhookUrl: n8nConfig.webhookUrl,
        apiUrl: n8nConfig.apiUrl,
        apiToken: localStorage.getItem(this.N8N_TOKEN_KEY) || n8nConfig.apiToken,
      },
      backend: {
        apiUrl: this.getBackendUrl(),
      },
    };

    console.log('🔄 Default config from env vars:', {
      VITE_N8N_ENVIRONMENT: environment,
      VITE_N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || 'No configurada',
      VITE_N8N_API_URL: import.meta.env.VITE_N8N_API_URL || 'No configurada',
      VITE_N8N_LOCAL_WEBHOOK_URL: import.meta.env.VITE_N8N_LOCAL_WEBHOOK_URL || 'No configurada',
      VITE_N8N_PROD_WEBHOOK_URL: import.meta.env.VITE_N8N_PROD_WEBHOOK_URL || 'No configurada',
      VITE_FORCE_LOCAL_N8N: import.meta.env.VITE_FORCE_LOCAL_N8N,
      backendUrl: this.getBackendUrl()
    });

    console.log('🔧 Configuración final de n8n:', {
      webhookUrl: defaultConfig.n8n.webhookUrl,
      apiUrl: defaultConfig.n8n.apiUrl,
      apiToken: defaultConfig.n8n.apiToken ? 'Presente' : 'Ausente'
    });

    // En modo desarrollo local, ignorar localStorage para forzar uso de variables de entorno
    if (this.isLocalDevelopment()) {
      console.log('🚀 Modo desarrollo local: ignorando localStorage y usando solo variables de entorno');
      
      // Limpiar TODA la configuración guardada en modo desarrollo para evitar conflictos
      if (savedConfig) {
        console.log('🧹 Limpiando configuración guardada en localStorage para modo desarrollo');
        localStorage.removeItem(this.CONFIG_KEY);
        localStorage.removeItem(this.N8N_TOKEN_KEY);
        // Limpiar cualquier otra configuración de n8n que pueda existir
        localStorage.removeItem('n8n_config');
        localStorage.removeItem('n8nConfig');
        localStorage.removeItem('app_config');
      }
      
      return defaultConfig;
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        console.log('📦 Merging with saved config from localStorage');
        return this.mergeConfigs(defaultConfig, parsed);
      } catch (error) {
        console.error('❌ Error parsing saved config:', error);
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
    const environment = import.meta.env.VITE_N8N_ENVIRONMENT || 'local';
    
    console.log(`🌍 Entorno configurado: ${environment}`);
    
    // Si está configurado como production, usar configuración de producción directamente
    if (environment === 'production') {
      console.log('� Modo producción detectado - usando configuración de VPS');
      const prodConfig = {
        webhookUrl: import.meta.env.VITE_N8N_PROD_WEBHOOK_URL || 'http://148.230.92.75:5678/webhook',
        apiUrl: import.meta.env.VITE_N8N_PROD_API_URL || 'https://n8n-n8n.hrxtio.easypanel.host/api/v1',
        apiToken: import.meta.env.VITE_N8N_PROD_API_TOKEN || ''
      };
      console.log('🔧 Configuración de producción:', prodConfig);
      return prodConfig;
    }
    
    // Solo para modo local, intentar obtener del backend primero
    if (environment === 'local') {
      console.log('🏠 Modo local detectado');
      try {
        const config = await this.getConfig();
        if (config?.n8n) {
          console.log('✅ Configuración obtenida del backend:', config.n8n);
          return config.n8n;
        }
      } catch (error) {
        console.log('⚠️ Error obteniendo configuración del backend, usando fallback local');
      }
      
      // Fallback para modo local
      const localConfig = {
        webhookUrl: import.meta.env.VITE_N8N_LOCAL_WEBHOOK_URL || 'http://localhost:5678/webhook',
        apiUrl: import.meta.env.VITE_N8N_LOCAL_API_URL || 'http://localhost:5678/api/v1',
        apiToken: import.meta.env.VITE_N8N_LOCAL_API_TOKEN || ''
      };
      console.log('🔧 Configuración local:', localConfig);
      return localConfig;
    }
    
    // Fallback general
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
    console.log('🔧 URL final del backend:', config.backend.apiUrl);
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
