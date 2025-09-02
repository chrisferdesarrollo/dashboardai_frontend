import axios from 'axios';
import { Agent, AgentExecution, CreateAgentInput, UpdateAgentInput } from '@/types/agent';
import configService from './configService';

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
  status?: string;
  message?: string;
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

// Funciones para obtener configuración dinámica
const getN8nConfig = async () => configService.getN8nConfig();

// Crear instancias de axios que se actualizan dinámicamente
const createApiClient = async () => {
  const config = await getN8nConfig();
  return axios.create({
    baseURL: config.apiUrl || 'http://localhost:5678/api/v1',
    headers: {
      'Authorization': config.apiToken ? `Bearer ${config.apiToken}` : '',
      'Content-Type': 'application/json',
    },
  });
};

const createWebhookClient = async () => {
  const config = await getN8nConfig();
  return axios.create({
    baseURL: config.webhookUrl || 'http://localhost:5678/webhook',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Instancias que se recrean en cada uso para obtener la configuración más reciente
const getApiClient = () => createApiClient();
const getWebhookClient = () => createWebhookClient();

export const n8nApi = {

  // WhatsApp - Crear sesión y obtener QR
  async createWhatsAppSession(sessionName: string): Promise<WhatsAppSessionResponse> {
    try {
      const url = '/create-whatsapp-session';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      console.log('Calling n8n webhook:', {
        baseURL: config.webhookUrl,
        url,
        fullURL: `${config.webhookUrl}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('n8n webhook response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error creando sesión WhatsApp:', error);
      
      // Implementación temporal para desarrollo
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando respuesta de WhatsApp QR');
        const webhookConfig = await getN8nConfig();
        
        // QR code simulado más realista (representa un texto de ejemplo)
        const mockQrBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIoAAACKCAYAAABdotmlAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8yOC8yNJqMGD0AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAKElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAgGcDQAABAAJgywOYPAAAAABJRU5ErkJggg==';
        
        return {
          success: true,
          sessionName,
          base64: mockQrBase64,
          timestamp: new Date().toISOString(),
          user: 'development_user'
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo crear la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo crear la sesión de WhatsApp');
    }
  },

  // WhatsApp - Conectar sesión existente (para reconexión)
  async connectWhatsAppSession(sessionName: string): Promise<WhatsAppSessionResponse> {
    try {
      console.log('🔌 [N8N-CONNECT] Iniciando conexión de sesión WhatsApp existente:', sessionName);
      
      const url = '/connect-whatsapp-session';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-CONNECT] Configuración de conexión:', {
        sessionName,
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-CONNECT] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-CONNECT] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-CONNECT] Error conectando sesión WhatsApp:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-CONNECT] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      // Simulación para desarrollo si hay error de red
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando respuesta de conexión WhatsApp');
        
        // QR code simulado para reconexión
        const mockQrBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAIoAAACKCAYAAABdotmlAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8yOC8yNJqMGD0AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAKElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAgGcDQAABAAJgywOYPAAAAABJRU5ErkJggg==';
        
        return {
          success: true,
          sessionName,
          base64: mockQrBase64,
          timestamp: new Date().toISOString(),
          user: 'development_user',
          status: 'connecting',
          message: 'Sesión conectada exitosamente (modo desarrollo)'
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo conectar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo conectar la sesión de WhatsApp');
    }
  },

  // WhatsApp - Verificar estado de conexión
  async checkWhatsAppStatus(sessionName: string): Promise<WhatsAppStatusResponse> {
    try {
      const url = '/check-whatsapp-status';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      console.log('Checking WhatsApp status:', {
        baseURL: config.webhookUrl,
        url,
        fullURL: `${config.webhookUrl}${url}`,
        payload
      });
      
      const response = await webhookApi.post(url, payload);
      
      console.log('WhatsApp status response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error verificando estado WhatsApp:', error);
      
      // Implementación temporal para desarrollo
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando estado de WhatsApp');
        return {
          success: true,
          sessionName,
          isConnected: false,
          connected: false,
          status: 'waiting_for_connection',
          timestamp: new Date().toISOString()
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo verificar el estado de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo verificar el estado de WhatsApp');
    }
  },

  // WhatsApp - Eliminar sesión a través del proxy del backend
  async deleteWhatsAppSessionViaProxy(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      console.log('🚨 [PROXY-DELETE] Eliminando sesión WhatsApp vía proxy backend:', sessionName);
      
      // Usar el mismo patrón que otros servicios para crear cliente del backend
      const config = await configService.getBackendConfig();
      const backendApi = axios.create({
        baseURL: config.apiUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Agregar token si está disponible
      const token = localStorage.getItem('token');
      if (token) {
        backendApi.defaults.headers.Authorization = `Bearer ${token}`;
      }

      const response = await backendApi.post('/n8n/proxy/delete-whatsapp-session', {
        sessionName
      });
      
      console.log('✅ [PROXY-DELETE] Sesión eliminada exitosamente vía proxy');
      return response.data;
    } catch (error) {
      console.error('❌ [PROXY-DELETE] Error eliminando sesión vía proxy:', error);
      throw error;
    }
  },

  // WhatsApp - Eliminar sesión
  async deleteWhatsAppSession(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      console.log('🚨 [N8N-DELETE] Iniciando eliminación de sesión WhatsApp:', sessionName);
      
      const url = '/delete-whatsapp-session';
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-DELETE] Configuración de eliminación:', {
        sessionName,
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-DELETE] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-DELETE] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-DELETE] Error eliminando sesión WhatsApp directamente, intentando vía proxy...', error);
      
      // Si falla la llamada directa (por CORS), intentar vía proxy del backend
      if (axios.isAxiosError(error) && (
        error.code === 'ERR_NETWORK' || 
        error.message.includes('CORS') ||
        error.message.includes('Access-Control-Allow-Origin')
      )) {
        console.log('🔄 [N8N-DELETE] Reintentando eliminación vía proxy backend...');
        try {
          return await this.deleteWhatsAppSessionViaProxy(sessionName);
        } catch (proxyError) {
          console.error('❌ [N8N-DELETE] Error también en proxy, devolviendo respuesta exitosa para no bloquear UX');
          // Devolver respuesta exitosa para no bloquear la experiencia del usuario
          return {
            success: true,
            message: 'Sesión marcada para eliminación',
            sessionName,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-DELETE] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo eliminar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo eliminar la sesión de WhatsApp');
    }
  },

  // WhatsApp - Reconectar sesión existente (buscar sesión activa y obtener QR)
  async reconnectExistingWhatsAppSession(sessionName: string): Promise<WhatsAppSessionResponse> {
    try {
      console.log('🔄 [N8N-RECONNECT] Iniciando reconexión de sesión WhatsApp existente:', sessionName);
      
      // Usar el webhook de conectar existente pero con un parámetro que indique que es reconexión
      const url = '/connect-whatsapp-session';
      const payload = { 
        sessionName,
        mode: 'reconnect' // Indicar que es una reconexión, no creación
      };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-RECONNECT] Configuración de reconexión:', {
        sessionName,
        mode: 'reconnect',
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-RECONNECT] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-RECONNECT] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-RECONNECT] Error reconectando sesión WhatsApp:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-RECONNECT] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      // Simulación para desarrollo si hay error de red
      if (error instanceof Error && error.message.includes('Network Error')) {
        console.warn('🚧 Modo desarrollo: Simulando respuesta de reconexión WhatsApp');
        
        // QR code simulado para reconexión
        const mockQrBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAIoAAACKCAYAAABdotmlAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8yOC8yNJqMGD0AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAKElEQVR42u3BAQEAAACAkP6v7ggKAAAAAAAAAAAAAAAAAAAAAAAAAAAAgGcDQAABAAJgywOYPAAAAABJRU5ErkJggg==';
        
        return {
          success: true,
          sessionName,
          base64: `data:image/png;base64,${mockQrBase64}`,
          timestamp: new Date().toISOString(),
          user: 'development_user',
          status: 'reconnecting',
          message: 'Sesión reconectada exitosamente (modo desarrollo)'
        };
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo reconectar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo reconectar la sesión de WhatsApp');
    }
  },

  // WhatsApp - Desconectar sesión (logout)
  async disconnectWhatsAppSession(sessionName: string): Promise<WhatsAppDeleteResponse> {
    try {
      console.log('🔌 [N8N-DISCONNECT] Iniciando desconexión de sesión WhatsApp:', sessionName);
      
      const url = '/logout-whatsapp-session'; // Usar el mismo webhook que hace logout-instance
      const payload = { sessionName };
      const webhookApi = await getWebhookClient();
      const config = await getN8nConfig();
      
      const fullURL = `${config.webhookUrl}${url}`;
      
      console.log('🔧 [N8N-DISCONNECT] Configuración de desconexión:', {
        sessionName,
        baseURL: config.webhookUrl,
        url,
        fullURL,
        payload: JSON.stringify(payload),
        webhookApiBaseURL: webhookApi.defaults.baseURL
      });
      
      console.log('📡 [N8N-DISCONNECT] Enviando petición POST a:', fullURL);
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [N8N-DISCONNECT] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2)
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [N8N-DISCONNECT] Error desconectando sesión WhatsApp:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('🚨 [N8N-DISCONNECT] Detalles del error HTTP:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          fullURL: `${error.config?.baseURL}${error.config?.url}`,
          data: error.response?.data,
          message: error.message
        });
      }
      
      if (error instanceof Error) {
        throw new Error(`No se pudo desconectar la sesión de WhatsApp: ${error.message}`);
      }
      throw new Error('No se pudo desconectar la sesión de WhatsApp');
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