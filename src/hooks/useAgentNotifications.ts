import { useEffect, useCallback, useRef } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAgentStore } from '@/store/agentStore';
import conversationLogApi, { ConversationLogResponse } from '@/services/conversationLogApi';

/**
 * Hook para manejar notificaciones de mensajes de agentes en tiempo real
 * Este hook se conecta a la base de datos a través de polling para obtener
 * nuevos conversation logs y generar notificaciones correspondientes
 */
export const useAgentNotifications = () => {
  const { addNotification, lastPollingTimestamp, setLastPollingTimestamp } = useNotificationStore();
  const { agents } = useAgentStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedLogIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Función para crear notificación de nuevo mensaje desde conversation log
  const createMessageNotification = useCallback((log: ConversationLogResponse) => {
    // Obtener el agente correspondiente si existe
    const agent = agents.find(a => a.id === log.agentId);
    const agentName = agent?.name || 'Agente';
    
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
  }, [addNotification, agents]);

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
      // Obtener el timestamp del último polling
      const since = lastPollingTimestamp 
        ? new Date(lastPollingTimestamp).toISOString()
        : undefined;

      // Hacer la consulta a la API
      const response = await conversationLogApi.getRecentForNotifications(since);
      
      if (response.success && response.data) {
        // Filtrar logs que tengan userMessage (mensajes de usuarios)
        const newUserMessages = response.data.filter(log => 
          log.userMessage && 
          log.userMessage.trim() !== '' &&
          !processedLogIdsRef.current.has(log.id) // Solo logs que no hemos procesado
        );

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
      }
    } catch (error) {
      console.error('Error polling for new conversation logs:', error);
      // No crear notificación de error para evitar spam
    }
  }, [lastPollingTimestamp, setLastPollingTimestamp, createMessageNotification]);

  // Configurar polling en tiempo real
  useEffect(() => {
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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollForNewLogs]);

  return {
    createMessageNotification: (log: ConversationLogResponse) => createMessageNotification(log),
    createAgentErrorNotification,
    createAgentConnectedNotification,
    createAgentDisconnectedNotification,
    pollForNewLogs, // Exponer para testing manual
  };
};