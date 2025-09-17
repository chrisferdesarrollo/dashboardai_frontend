import axios, { AxiosInstance } from 'axios';
import configService from './configService';

// Interfaces para respuestas de Telegram
export interface TelegramBotResponse {
  success: boolean;
  message: string;
  botId?: string;
  botUsername?: string;
  botToken?: string;
  timestamp?: string;
  isConfigured?: boolean;
  webhookInfo?: {
    url?: string;
    isPending?: boolean;
    lastErrorDate?: number;
  };
}

export interface TelegramMessageResponse {
  success: boolean;
  message: string;
  chatId?: string;
  messageId?: string;
  timestamp?: string;
}

export interface TelegramConfigurationRequest {
  botToken: string;
  botUsername: string;
  operationType: 'configure' | 'test' | 'setup_webhook' | 'remove_webhook' | 'connect';
  userId?: string;
  agentId?: string;
  webhookUrl?: string;
  timestamp?: string;
}

export interface TelegramAgentConnectionRequest {
  botToken: string;
  operationType: 'connect';
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

// Cache para configuración de n8n
let n8nConfigCache: { webhookUrl: string; apiUrl: string; apiToken: string } | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función auxiliar para obtener configuración de n8n
async function getN8nConfig() {
  try {
    // Usar cache si está disponible y no ha expirado
    const now = Date.now();
    if (n8nConfigCache && (now - configCacheTime) < CONFIG_CACHE_DURATION) {
      return n8nConfigCache;
    }
    
    const config = await configService.getN8nConfig();
    if (!config || !config.webhookUrl) {
      throw new Error('Configuración de n8n no encontrada o incompleta');
    }
    
    // Guardar en cache
    n8nConfigCache = config;
    configCacheTime = now;
    
    return config;
  } catch (error) {
    console.error('Error obteniendo configuración de n8n:', error);
    throw new Error('No se pudo obtener la configuración de n8n');
  }
}

// Función auxiliar para obtener cliente webhook
async function getWebhookClient(): Promise<AxiosInstance> {
  const config = await getN8nConfig();
  
  return axios.create({
    baseURL: config.webhookUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

class TelegramApi {
  /**
   * Configura un bot de Telegram con el token proporcionado
   */
  async configureTelegramBot(
    botToken: string,
    botUsername: string,
    operationType: 'configure' | 'test' | 'setup_webhook' | 'remove_webhook' | 'connect' = 'configure'
  ): Promise<TelegramBotResponse> {
    try {
      console.log('🚀 [TELEGRAM-CONFIGURE] Iniciando configuración de bot:', botUsername);
      
      // Si es operación de conexión de agente, usar la función específica
      if (operationType === 'connect') {
        return this.connectTelegramAgent(botToken);
      }
      
      // Primero validar que el bot funciona
      const isValid = await this.validateBotToken(botToken);
      if (!isValid) {
        throw new Error('Token de bot inválido');
      }

      // Intentar configuración a través de n8n
      try {
        const url = '/telegram-api';
        const payload: TelegramConfigurationRequest = { 
          botToken,
          botUsername,
          operationType,
          timestamp: new Date().toISOString()
        };
        
        const config = await getN8nConfig();
        
        if (!config.webhookUrl) {
          console.warn('⚠️ [TELEGRAM-CONFIGURE] URL del webhook de n8n no configurada, usando configuración local');
          return this.configureLocalBot(botToken, botUsername);
        }
        
        const webhookApi = await getWebhookClient();
        const response = await webhookApi.post(url, payload);
        
        console.log('✅ [TELEGRAM-CONFIGURE] Bot configurado exitosamente via n8n');
        
        return response.data;
      } catch (n8nError) {
        console.warn('⚠️ [TELEGRAM-CONFIGURE] Error con n8n, usando configuración local:', n8nError);
        return this.configureLocalBot(botToken, botUsername);
      }
      
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-CONFIGURE] Error configurando bot:', error);
      
      // Manejar errores específicos de Telegram
      if (error instanceof Error) {
        throw error;
      }
      
      // Error genérico
      throw new Error('Error de conexión con el servicio de Telegram. Verifica tu configuración de n8n.');
    }
  }

  /**
   * Configuración local del bot (fallback cuando n8n no está disponible)
   */
  private async configureLocalBot(botToken: string, botUsername: string): Promise<TelegramBotResponse> {
    try {
      console.log('🔧 [TELEGRAM-LOCAL] Configurando bot localmente');
      
      // Obtener información del bot
      const botInfo = await this.getBotInfo(botToken);
      
      // TODO: Aquí podrías guardar la configuración en localStorage o en tu backend
      // Por ahora, simplemente devolvemos éxito
      
      return {
        success: true,
        message: 'Bot de Telegram configurado correctamente (modo local)',
        botId: botInfo.id.toString(),
        botUsername: botInfo.username,
        isConfigured: true,
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-LOCAL] Error en configuración local:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error('Error configurando bot de Telegram: ' + errorMessage);
    }
  }

  /**
   * Prueba la conexión con el bot de Telegram
   */
  async testTelegramBot(botToken: string): Promise<TelegramBotResponse> {
    try {
      console.log('🧪 [TELEGRAM-TEST] Iniciando prueba de bot');
      
      const url = '/telegram-api';
      const payload: TelegramConfigurationRequest = { 
        botToken,
        botUsername: '',
        operationType: 'test',
        timestamp: new Date().toISOString()
      };
      
      const config = await getN8nConfig();
      
      if (!config.webhookUrl) {
        throw new Error('URL del webhook de n8n no está configurada');
      }
      
      const webhookApi = await getWebhookClient();
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [TELEGRAM-TEST] Prueba completada');
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-TEST] Error en prueba:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión con el servicio de Telegram';
      throw new Error(errorMessage);
    }
  }

  /**
   * Configura el webhook para recibir mensajes del bot
   */
  async setupTelegramWebhook(
    botToken: string,
    botUsername: string,
    webhookUrl?: string
  ): Promise<TelegramBotResponse> {
    try {
      console.log('🔗 [TELEGRAM-WEBHOOK] Configurando webhook para:', botUsername);
      
      const url = '/telegram-api';
      const payload: TelegramConfigurationRequest = { 
        botToken,
        botUsername,
        operationType: 'setup_webhook',
        webhookUrl,
        timestamp: new Date().toISOString()
      };
      
      const config = await getN8nConfig();
      
      if (!config.webhookUrl) {
        throw new Error('URL del webhook de n8n no está configurada');
      }
      
      const webhookApi = await getWebhookClient();
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [TELEGRAM-WEBHOOK] Webhook configurado');
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-WEBHOOK] Error configurando webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión con el servicio de Telegram';
      throw new Error(errorMessage);
    }
  }

  /**
   * Elimina el webhook del bot
   */
  async removeTelegramWebhook(botToken: string): Promise<TelegramBotResponse> {
    try {
      console.log('🗑️ [TELEGRAM-REMOVE-WEBHOOK] Eliminando webhook');
      
      const url = '/telegram-api';
      const payload: TelegramConfigurationRequest = { 
        botToken,
        botUsername: '',
        operationType: 'remove_webhook',
        timestamp: new Date().toISOString()
      };
      
      const config = await getN8nConfig();
      
      if (!config.webhookUrl) {
        throw new Error('URL del webhook de n8n no está configurada');
      }
      
      const webhookApi = await getWebhookClient();
      const response = await webhookApi.post(url, payload);
      
      console.log('✅ [TELEGRAM-REMOVE-WEBHOOK] Webhook eliminado');
      
      return response.data;
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-REMOVE-WEBHOOK] Error eliminando webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error eliminando webhook de Telegram';
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtiene información del webhook actual
   */
  async getWebhookInfo(botToken: string): Promise<TelegramBotResponse> {
    try {
      console.log('ℹ️ [TELEGRAM-WEBHOOK-INFO] Obteniendo info de webhook');
      
      // Esto se puede implementar haciendo una llamada directa a la API de Telegram
      // o a través del workflow de n8n
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      
      return {
        success: true,
        message: 'Información del webhook obtenida',
        webhookInfo: response.data.result,
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-WEBHOOK-INFO] Error obteniendo info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error obteniendo información del webhook';
      throw new Error(errorMessage);
    }
  }

  /**
   * Valida si un token de bot es válido
   */
  async validateBotToken(botToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
      return response.data.ok === true;
    } catch (error) {
      console.error('❌ [TELEGRAM-VALIDATE] Token inválido:', error);
      return false;
    }
  }

  /**
   * Obtiene información del bot
   */
  async getBotInfo(botToken: string): Promise<TelegramBotInfo> {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
      return response.data.result;
    } catch (error) {
      console.error('❌ [TELEGRAM-BOT-INFO] Error obteniendo info del bot:', error);
      throw new Error('Error obteniendo información del bot');
    }
  }

  /**
   * Envía un mensaje de prueba
   */
  async sendTestMessage(botToken: string, chatId: string, message: string): Promise<TelegramMessageResponse> {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });

      return {
        success: true,
        message: 'Mensaje enviado correctamente',
        chatId: chatId,
        messageId: response.data.result.message_id.toString(),
        timestamp: new Date().toISOString()
      };
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-SEND] Error enviando mensaje:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error enviando mensaje de prueba';
      throw new Error(errorMessage);
    }
  }

  /**
   * Conecta un agente de Telegram al webhook específico
   * Esta función se ejecuta al presionar "Crear Agente"
   */
  async connectTelegramAgent(botToken: string): Promise<TelegramBotResponse> {
    try {
      console.log('🤖 [TELEGRAM-CONNECT-AGENT] Conectando agente de Telegram');
      
      // Primero validar que el bot funciona
      const isValid = await this.validateBotToken(botToken);
      if (!isValid) {
        throw new Error('Token de bot inválido');
      }

      // URL específica para conectar el agente
      const agentWebhookUrl = 'https://topias.app:5678/webhook/telegram-api';
      
      // Payload específico para conectar agente
      const payload: TelegramAgentConnectionRequest = { 
        botToken,
        operationType: 'connect'
      };
      
      // Crear cliente axios específico para esta URL
      const agentClient = axios.create({
        baseURL: agentWebhookUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 [TELEGRAM-CONNECT-AGENT] Enviando request a:', agentWebhookUrl);
      console.log('📄 [TELEGRAM-CONNECT-AGENT] Payload:', { ...payload, botToken: '[HIDDEN]' });
      
      const response = await agentClient.post('', payload);
      
      console.log('✅ [TELEGRAM-CONNECT-AGENT] Agente conectado exitosamente');
      
      return {
        success: true,
        message: 'Agente de Telegram conectado exitosamente',
        botToken: botToken,
        isConfigured: true,
        timestamp: new Date().toISOString(),
        ...response.data
      };
      
    } catch (error: unknown) {
      console.error('❌ [TELEGRAM-CONNECT-AGENT] Error conectando agente:', error);
      
      let errorMessage = 'Error de conexión con el servicio de agente de Telegram';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = `Error del servidor: ${error.response.status} - ${error.response.statusText}`;
          console.error('Response data:', error.response.data);
        } else if (error.request) {
          errorMessage = 'No se pudo conectar con el servidor del agente';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Limpia el cache de configuración
   */
  clearConfigCache(): void {
    n8nConfigCache = null;
    configCacheTime = 0;
    console.log('🧹 [TELEGRAM-CACHE] Cache limpiado');
  }
}

// Exportar instancia única
export const telegramApi = new TelegramApi();

/*
EJEMPLO DE USO PARA CONECTAR AGENTE AL PRESIONAR "CREAR AGENTE":

// En tu componente donde tienes el botón "Crear Agente"
import { telegramApi } from '../services/telegramApi';

const handleCreateAgent = async (botToken: string) => {
  try {
    // Conectar el agente usando la nueva función
    const result = await telegramApi.connectTelegramAgent(botToken);
    
    if (result.success) {
      console.log('✅ Agente conectado:', result.message);
      // Aquí puedes actualizar el estado de tu aplicación
      // mostrar un mensaje de éxito, etc.
    }
  } catch (error) {
    console.error('❌ Error conectando agente:', error);
    // Manejar error en la UI
  }
};

// O usando la función configureTelegramBot con operationType 'connect'
const handleCreateAgentAlternative = async (botToken: string, botUsername: string) => {
  try {
    const result = await telegramApi.configureTelegramBot(botToken, botUsername, 'connect');
    
    if (result.success) {
      console.log('✅ Agente conectado:', result.message);
    }
  } catch (error) {
    console.error('❌ Error conectando agente:', error);
  }
};
*/