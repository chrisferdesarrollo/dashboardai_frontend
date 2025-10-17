import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAgentStore } from '@/store/agentStore';
import conversationLogApi, { ConversationLogResponse } from '@/services/conversationLogApi';

// Singleton para evitar múltiples instancias
let isPollingActive = false;
let pollingInstanceCount = 0;

/**
 * Hook para manejar notificaciones de mensajes de agentes en tiempo real
 * Este hook se conecta a la base de datos a través de polling para obtener
 * nuevos conversation logs y generar notificaciones correspondientes
 */
export const useAgentNotifications = () => {
  const { 
    addNotification, 
    lastPollingTimestamp, 
    setLastPollingTimestamp,
    updateConversationNewMessages,
    getNewMessagesForSession 
  } = useNotificationStore();
  const { agents } = useAgentStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedLogIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);
  const instanceIdRef = useRef<number>(++pollingInstanceCount);

  console.log(`🔄 NotificationHook Instance ${instanceIdRef.current} initialized`);

  // Función para crear notificación de nuevo mensaje desde conversation log
  const createMessageNotification = useCallback((log: ConversationLogResponse) => {
    // Usar el nombre del agente que viene del backend
    // Si no viene, usar el fallback anterior
    let agentName = log.agentName || 'Agente';
    
    // Solo si no viene agentName del backend, intentar buscar localmente
    if (!log.agentName && log.agentId) {
      // Buscar por ID exacto
      const agent = agents.find(a => a.id === log.agentId);
      if (agent) {
        agentName = agent.name;
      } else {
        // Si no se encuentra por ID, intentar usar el sessionName como fallback
        // Ejemplo: "session_whatsapp_123" -> buscar agente que contenga "whatsapp"
        const sessionLower = log.sessionName.toLowerCase();
        const agentBySession = agents.find(a => 
          sessionLower.includes(a.name.toLowerCase()) || 
          sessionLower.includes(a.platform.toLowerCase())
        );
        if (agentBySession) {
          agentName = agentBySession.name;
        }
      }
    }
    
    // Actualizar contador de mensajes nuevos para esta conversación
    updateConversationNewMessages(log.sessionName, 1);
    
    // Log para debugging
    console.log('📨 Creando notificación para agente:', {
      agentId: log.agentId,
      agentName,
      agentNameFromBackend: log.agentName,
      sessionName: log.sessionName,
      totalAgents: agents.length,
      newMessagesCount: getNewMessagesForSession(log.sessionName)
    });
    
    // Crear mensaje preview desde el user message
    const messagePreview = log.userMessage 
      ? log.userMessage.length > 50 
        ? log.userMessage.substring(0, 50) + '...'
        : log.userMessage
      : 'Nuevo mensaje';

    addNotification({
      type: 'message',
      title: `Nuevo mensaje para ${agentName}`,
      message: `${log.userName || 'Usuario'} desde ${log.platform || 'plataforma'}: ${messagePreview}`,
      agentName,
      agentId: log.agentId || '',
      conversationId: log.sessionName,
      priority: 'medium',
      actionUrl: `/conversations?session=${log.sessionName}`,
    });
  }, [addNotification, agents, updateConversationNewMessages, getNewMessagesForSession]);

  // Función para crear notificación de error de agente
  const createAgentErrorNotification = useCallback((agentName: string, agentId: string, errorMessage: string) => {
    addNotification({
      type: 'agent_error',
      title: `Error en ${agentName}`,
      message: errorMessage,
      agentName,
      agentId,
      priority: 'high',
      actionUrl: `/agents?id=${agentId}`,
    });
  }, [addNotification]);

  // Función para crear notificación de agente conectado
  const createAgentConnectedNotification = useCallback((agentName: string, agentId: string) => {
    addNotification({
      type: 'success',
      title: `${agentName} conectado`,
      message: `El agente ${agentName} se ha conectado correctamente y está listo para recibir mensajes.`,
      agentName,
      agentId,
      priority: 'low',
      actionUrl: `/agents?id=${agentId}`,
    });
  }, [addNotification]);

  // Función para crear notificación de agente desconectado
  const createAgentDisconnectedNotification = useCallback((agentName: string, agentId: string) => {
    addNotification({
      type: 'warning',
      title: `${agentName} desconectado`,
      message: `El agente ${agentName} se ha desconectado y no puede recibir mensajes.`,
      agentName,
      agentId,
      priority: 'medium',
      actionUrl: `/agents?id=${agentId}`,
    });
  }, [addNotification]);

  // Función para hacer polling de nuevos conversation logs
  const pollForNewLogs = useCallback(async () => {
    try {
      console.log('🔍 Polling for new logs...');
      
      // Obtener el timestamp del último polling
      const since = lastPollingTimestamp 
        ? new Date(lastPollingTimestamp).toISOString()
        : undefined;

      console.log('📅 Polling since timestamp:', since);

      // Hacer la consulta a la API
      const response = await conversationLogApi.getNotifications(since);
      
      console.log('📡 API Response:', response);
      
      if (response.success && response.data) {
        console.log('✅ API call successful, received', response.data.length, 'logs');
        
        // Filtrar logs que tengan userMessage (mensajes de usuarios)
        const newUserMessages = response.data.filter(log => 
          log.userMessage && 
          log.userMessage.trim() !== '' &&
          !processedLogIdsRef.current.has(log.id) // Solo logs que no hemos procesado
        );

        console.log('🔍 Filtered to', newUserMessages.length, 'new user messages');

        // En la primera carga, solo registrar los IDs sin crear notificaciones
        if (isFirstLoadRef.current) {
          response.data.forEach(log => {
            processedLogIdsRef.current.add(log.id);
          });
          isFirstLoadRef.current = false;
          
          // Establecer el timestamp inicial
          if (response.data.length > 0) {
            const latestTimestamp = Math.max(
              ...response.data.map(log => new Date(log.createdAt).getTime())
            );
            setLastPollingTimestamp(latestTimestamp);
          } else {
            setLastPollingTimestamp(Date.now());
          }
          
          console.log('✅ Primera carga completada, registrados', processedLogIdsRef.current.size, 'logs existentes');
        } else {
          // En llamadas posteriores, crear notificaciones para mensajes nuevos
          newUserMessages.forEach(log => {
            console.log('🔔 Creating notification for log:', log.id, log.sessionName);
            createMessageNotification(log);
            processedLogIdsRef.current.add(log.id);
          });

          // Actualizar el timestamp del último polling
          if (response.data.length > 0) {
            const latestTimestamp = Math.max(
              ...response.data.map(log => new Date(log.createdAt).getTime())
            );
            setLastPollingTimestamp(latestTimestamp);
          }
          
          if (newUserMessages.length > 0) {
            console.log('🔔 Creadas', newUserMessages.length, 'nuevas notificaciones');
          }
        }
      } else {
        console.warn('❌ API call failed or no success flag');
      }
    } catch (error) {
      console.error('❌ Error polling for new conversation logs:', error);
      // No crear notificación de error para evitar spam
    }
  }, [lastPollingTimestamp, setLastPollingTimestamp, createMessageNotification]);

  // Configurar polling en tiempo real
  useEffect(() => {
    const currentInstanceId = instanceIdRef.current;
    console.log(`🚀 Instance ${currentInstanceId}: Starting polling. Active: ${isPollingActive}`);
    
    // Solo permitir una instancia de polling activa
    if (isPollingActive) {
      console.log(`⚠️ Instance ${currentInstanceId}: Polling already active, skipping`);
      return;
    }

    isPollingActive = true;
    console.log(`✅ Instance ${currentInstanceId}: Activated polling`);

    // Limpiar interval anterior si existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Hacer una consulta inicial inmediatamente
    pollForNewLogs();

    // Configurar polling cada 10 segundos
    pollingIntervalRef.current = setInterval(pollForNewLogs, 10000);

    // Cleanup function
    return () => {
      console.log(`🛑 Instance ${currentInstanceId}: Cleaning up polling`);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (isPollingActive) {
        isPollingActive = false;
        console.log(`✅ Instance ${currentInstanceId}: Deactivated polling`);
      }
    };
  }, [pollForNewLogs]);

  return {
    createMessageNotification: (log: ConversationLogResponse) => createMessageNotification(log),
    createAgentErrorNotification,
    createAgentConnectedNotification,
    createAgentDisconnectedNotification,
    pollForNewLogs, // Exponer para testing manual
    getNewMessagesForSession, // Exponer función para obtener mensajes nuevos por sesión
  };
};