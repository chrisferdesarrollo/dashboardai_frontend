import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Conversation, ConversationStats, ConversationFilter, Message, ContentSearchResult } from '@/types/conversation';
import conversationApi, { ConversationLogResponse, ConversationSessionSummary } from '@/services/conversationApi';
import agentApi, { AgentResponse } from '@/services/agentApi';
import { useAuthStore } from '@/store/authStore';

// Cache para nombres de agentes para evitar múltiples llamadas
const agentNameCache = new Map<string, string>();

// Función para obtener el nombre del agente desde el backend
const getAgentNameFromSession = async (sessionName: string): Promise<string> => {
  console.log('🔍 [NUEVO] Buscando agente para sessionName:', sessionName);
  
  // Limpiar cache para forzar nueva búsqueda
  agentNameCache.delete(sessionName);
  
  // Si ya tenemos el nombre en cache, devolverlo
  if (agentNameCache.has(sessionName)) {
    console.log('� [NUEVO] Nombre en cache:', agentNameCache.get(sessionName));
    return agentNameCache.get(sessionName)!;
  }

  try {
    console.log('� [NUEVO] Iniciando búsqueda de agentes...');
    
    // Obtener agentes del usuario actual
    const authStore = useAuthStore.getState?.() || { user: null };
    const currentUser = authStore.user;
    
    if (!currentUser?.id) {
      console.warn('⚠️ [NUEVO] No hay usuario autenticado');
      const fallbackName = sessionName.includes('agent_') ? 'WhatsApp Agent' : 'Telegram Bot';
      agentNameCache.set(sessionName, fallbackName);
      return fallbackName;
    }
    
    console.log('👤 [NUEVO] Usuario autenticado:', currentUser.id);
    const agentsResponse = await agentApi.getAgentsByUser(currentUser.id);
    console.log('📊 [NUEVO] Respuesta de agentes:', agentsResponse);
    
    // El backend puede devolver agentes en 'data' o 'agents'
    const agentsArray = agentsResponse.data || agentsResponse.agents;
    console.log('📋 [NUEVO] Array de agentes extraído:', agentsArray);
    
    if (agentsResponse.success && agentsArray && agentsArray.length > 0) {
      const firstAgent = agentsArray[0];
      agentNameCache.set(sessionName, firstAgent.name);
      return firstAgent.name;
    }
  } catch (error) {
    console.warn('Error obteniendo nombre del agente:', error);
  }
  
  // Fallback final
  const fallbackName = sessionName.includes('agent_') ? 'WhatsApp Agent' : 'Telegram Bot';
  agentNameCache.set(sessionName, fallbackName);
  return fallbackName;
};

// Función síncrona que devuelve nombre por defecto y actualiza asíncronamente
const getAgentNameFromSessionSync = (sessionName: string, forceRefresh?: () => void): string => {
  // Si tenemos el nombre en cache, devolverlo
  if (agentNameCache.has(sessionName)) {
    return agentNameCache.get(sessionName)!;
  }
  
  // Obtener nombre asíncronamente en background
  getAgentNameFromSession(sessionName)
    .then((resolvedName) => {
      // Si se resolvió un nombre diferente al fallback, forzar refresco
      if (forceRefresh && resolvedName !== `Agente ${sessionName.replace('agent_', '').slice(-4)}` && resolvedName !== 'Bot Telegram') {
        forceRefresh();
      }
    })
    .catch((error) => {
      console.error('Error resolviendo nombre asíncronamente:', error);
    });
  
  // Devolver nombre temporal mientras se resuelve
  if (sessionName.startsWith('agent_')) {
    const agentId = sessionName.replace('agent_', '');
    return `Agente ${agentId.slice(-4)}`;
  } else if (sessionName.startsWith('bot_')) {
    return 'Bot Telegram';
  }
  
  return 'Agente IA';
};

// Nuevo helper: buscar agentName usando un candidato de nombre (botName, platformConfig.sessionName, etc.) y plataforma
const getAgentNameByCandidate = async (nameCandidate: string | undefined, platform: 'whatsapp' | 'telegram', userId?: number): Promise<string> => {
  if (!nameCandidate) {
    return platform === 'whatsapp' ? 'WhatsApp Agent' : 'Telegram Bot';
  }

  const candidateKey = nameCandidate.trim();
  if (!candidateKey) return platform === 'whatsapp' ? 'WhatsApp Agent' : 'Telegram Bot';

  // Reusar cache si existe
  if (agentNameCache.has(candidateKey)) return agentNameCache.get(candidateKey)!;

  try {
    // Intentar búsqueda especializada en backend
    const agent = await agentApi.getAgentByNameAndPlatform(candidateKey, platform, userId);
    if (agent && agent.name) {
      agentNameCache.set(candidateKey, agent.name);
      return agent.name;
    }
  } catch (error) {
    console.warn('Error en getAgentNameByCandidate (backend):', error);
  }

  // Fallback a devolver el candidato tal cual
  agentNameCache.set(candidateKey, candidateKey);
  return candidateKey;
};

// Helper function para transformar logs de backend a conversaciones del frontend
const transformLogsToConversations = (sessionSummaries: ConversationSessionSummary[], allLogs: ConversationLogResponse[]): Conversation[] => {
  return sessionSummaries.map((summary, index) => {
    // Obtener todos los logs de esta sesión
    const sessionLogs = allLogs.filter(log => log.sessionName === summary.sessionName);
    
    // Ordenar por fecha de creación para obtener el último mensaje
    const sortedLogs = sessionLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastLog = sortedLogs[0];
    
    // Determinar el último mensaje (puede ser del usuario o de la IA)
    let lastMessage: Message | undefined;
    if (lastLog) {
      // Crear mensaje basado en si es el último mensaje del usuario o de la IA
      const isUserMessage = !!lastLog.userMessage;
      lastMessage = {
        id: `${lastLog.id}-${isUserMessage ? 'user' : 'ai'}`,
        conversationId: `conv-${summary.sessionName}`,
        content: isUserMessage ? lastLog.userMessage : lastLog.aiResponse || '',
        type: 'text',
        direction: isUserMessage ? 'incoming' : 'outgoing',
        timestamp: new Date(lastLog.createdAt),
        status: 'delivered'
      };
    }

    // Generar ID único para la conversación
    const conversationId = `conv-${summary.sessionName}-${index}`;
    
    // Detectar plataforma con lógica mejorada
    let platform: 'whatsapp' | 'telegram' = summary.platform as 'whatsapp' | 'telegram' || 'whatsapp';
    
    // Fallback para casos donde la plataforma viene como string no válido
    if (platform !== 'whatsapp' && platform !== 'telegram') {
      // 1. Si backend platform es válido y no es 'unknown', usarlo
      if (lastLog?.platform && lastLog.platform !== 'unknown' && lastLog.platform !== 'UNKNOWN') {
        platform = lastLog.platform as 'whatsapp' | 'telegram';
      } 
      // 2. Detectar por patrón de sessionName (más confiable)
      else if (lastLog?.sessionName) {
        const sessionLower = lastLog.sessionName.toLowerCase();
        
        if (sessionLower.startsWith('agent_') || 
            sessionLower.includes('whatsapp') || 
            sessionLower.includes('wa_')) {
          platform = 'whatsapp';
        } else if (sessionLower.startsWith('bot_') || 
                   sessionLower.startsWith('token_') ||
                   sessionLower.startsWith('telegram_agent_') ||
                   sessionLower.includes('telegram') || 
                   sessionLower.includes('tg_')) {
          platform = 'telegram';
        }
      }
      // 3. Detectar por formato de teléfono
      else if (lastLog?.userPhone?.includes('@c.us')) {
        platform = 'whatsapp';
      }
    }
    
    return {
      id: conversationId,
      agentId: 'agent-1', // TODO: obtener del sessionName o mapear desde agentes
      agentName: summary.agentName || 'Agente sin nombre', // Usar el nombre del agente del backend
      contact: {
        id: `contact-${summary.sessionName}`,
        name: lastLog?.userName || 'Usuario anónimo',
        phone: lastLog?.userPhone || '+00000000000',
        platformId: lastLog?.userPhone || `${summary.sessionName}@platform`,
        platform: platform,
        isBlocked: false,
        lastActivity: new Date(summary.lastActivity),
        createdAt: new Date(summary.startTime)
      },
      lastMessage,
      unreadCount: 0, // TODO: implementar lógica de mensajes no leídos
      status: 'active' as const, // TODO: determinar estado real basado en la actividad reciente
      tags: [], // TODO: implementar sistema de etiquetas
      createdAt: new Date(summary.startTime),
      updatedAt: new Date(summary.lastActivity),
      platform: platform,
      totalMessages: summary.messageCount,
      averageResponseTime: 120 // TODO: calcular tiempo promedio real
    } as Conversation;
  });
};

interface ConversationState {
  // State
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  loading: boolean;
  error: string | null;
  
  // Filtros y búsqueda
  searchTerm: string;
  filters: ConversationFilter;
  
  // Content search
  contentSearchResults: ContentSearchResult[];
  contentSearchLoading: boolean;
  contentSearchQuery: string;
  
  // Setters básicos
  setConversations: (conversations: Conversation[]) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (searchTerm: string) => void;
  setFilters: (filters: Partial<ConversationFilter>) => void;
  
  // Content search
  searchContent: (query: string, filters?: Partial<ConversationFilter>) => Promise<void>;
  clearContentSearch: () => void;
  exportContentSearchResults: (format: 'csv' | 'json') => void;
  
  // Operaciones
  fetchConversations: (platform?: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, platform?: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  updateConversationStatus: (conversationId: string, status: Conversation['status']) => Promise<void>;
  assignConversation: (conversationId: string, userId: string) => Promise<void>;
  addTag: (conversationId: string, tag: string) => Promise<void>;
  removeTag: (conversationId: string, tag: string) => Promise<void>;
  
  // Filtros
  updateFilters: (newFilters: Partial<ConversationFilter>) => void;
  
  // Getters
  getFilteredConversations: () => Conversation[];
  getConversationStats: () => ConversationStats;
  getUnreadCount: () => number;
}

export const useConversationStore = create<ConversationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      conversations: [],
      selectedConversation: null,
      messages: {},
      loading: false,
      error: null,
      searchTerm: '',
      
      // Content search state
      contentSearchResults: [],
      contentSearchLoading: false,
      contentSearchQuery: '',
      
      filters: {
        status: 'all',
        platform: 'all',
        agent: 'all',
        assignedTo: 'all',
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // última semana
          to: new Date()
        },
        tags: []
      },

      // Setters básicos
      setConversations: (conversations) => set({ conversations }),
      setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
      setMessages: (conversationId, messages) => 
        set((state) => ({
          messages: { ...state.messages, [conversationId]: messages }
        })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      setFilters: (newFilters) => {
        get().updateFilters(newFilters);
      },

      // Content search methods
      searchContent: async (query: string, filters?: Partial<ConversationFilter>) => {
        if (!query.trim()) {
          set({ contentSearchResults: [], contentSearchQuery: '' });
          return;
        }

        set({ contentSearchLoading: true, contentSearchQuery: query });
        
        try {
          // Obtener todos los logs
          const currentFilters = filters || get().filters;
          const platformFilter = currentFilters.platform !== 'all' ? currentFilters.platform : undefined;
          const allLogs = await conversationApi.getAllConversationLogs(platformFilter);
          
          // Filtrar logs que contengan el texto buscado
          const searchResults: ContentSearchResult[] = [];
          const queryLower = query.toLowerCase();
          
          for (const log of allLogs) {
            const logDate = new Date(log.createdAt);
            
            // Aplicar filtros de fecha
            if (logDate < currentFilters.dateRange.from || logDate > currentFilters.dateRange.to) {
              continue;
            }
            
            // Obtener nombre del agente
            // Prioridad de candidatos: log.botName -> platformConfig.sessionName -> log.sessionName
            const authState = useAuthStore.getState?.() || { user: null };
            const currentUserId = authState.user?.id;
            let nameCandidate: string | undefined = undefined;
            // Intenta extraer botName si viene en el log (Telegram)
            const logExt = log as unknown as Record<string, unknown> & { botName?: string; platformConfig?: unknown; };
            if (logExt.botName) {
              nameCandidate = logExt.botName as string;
            }
            // Intentar platformConfig si viene serializado
            if (!nameCandidate && logExt.platformConfig) {
              try {
                const rawPc = logExt.platformConfig;
                const pc = typeof rawPc === 'string' ? JSON.parse(rawPc as string) as Record<string, unknown> : rawPc as Record<string, unknown>;
                if (pc && typeof pc.sessionName === 'string') nameCandidate = pc.sessionName as string;
                if (pc && typeof pc.botName === 'string') nameCandidate = nameCandidate || (pc.botName as string);
              } catch (e) {
                // ignore parse errors
              }
            }
            // Fallback a sessionName si nada más
            if (!nameCandidate) nameCandidate = log.sessionName;

            const agentName = await getAgentNameByCandidate(nameCandidate, (log.platform as 'whatsapp' | 'telegram') || 'whatsapp', currentUserId);
            
            // Buscar en mensaje del usuario
            if (log.userMessage && log.userMessage.toLowerCase().includes(queryLower)) {
              searchResults.push({
                id: `${log.id}-user`,
                sessionName: log.sessionName,
                content: log.userMessage,
                type: 'user',
                phone: log.userPhone || 'No disponible',
                userName: log.userName || 'Usuario',
                agentName,
                platform: (log.platform as 'whatsapp' | 'telegram') || 'whatsapp',
                timestamp: new Date(log.timestamp),
                createdAt: new Date(log.createdAt),
                matchedText: query
              });
            }
            
            // Buscar en respuesta de IA
            if (log.aiResponse && log.aiResponse.toLowerCase().includes(queryLower)) {
              searchResults.push({
                id: `${log.id}-ai`,
                sessionName: log.sessionName,
                content: log.aiResponse,
                type: 'ai',
                phone: log.userPhone || 'No disponible',
                userName: log.userName || 'Usuario',
                agentName,
                platform: (log.platform as 'whatsapp' | 'telegram') || 'whatsapp',
                timestamp: new Date(log.timestamp),
                createdAt: new Date(log.createdAt),
                matchedText: query
              });
            }
          }
          
          // Ordenar por fecha descendente
          searchResults.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          set({ 
            contentSearchResults: searchResults,
            contentSearchLoading: false 
          });
          
        } catch (error) {
          console.error('Error searching content:', error);
          set({ 
            contentSearchResults: [], 
            contentSearchLoading: false,
            error: 'Error al buscar contenido'
          });
        }
      },

      clearContentSearch: () => {
        set({ 
          contentSearchResults: [], 
          contentSearchQuery: '',
          contentSearchLoading: false 
        });
      },

      exportContentSearchResults: (format: 'csv' | 'json') => {
        const results = get().contentSearchResults;
        if (results.length === 0) {
          alert('No hay resultados para exportar');
          return;
        }

        const formatPhoneNumber = (phone: string): string => {
          if (!phone || phone === 'No disponible') return phone;
          
          // Si ya tiene +, retornarlo tal como está
          if (phone.startsWith('+')) return phone;
          
          // Si empieza con 57 (Colombia), agregar +
          if (phone.startsWith('57') && phone.length >= 10) {
            return `+${phone}`;
          }
          
          // Si no tiene +, agregarlo
          return `+${phone}`;
        };

        if (format === 'csv') {
          const headers = ['Fecha', 'Hora', 'Teléfono', 'Usuario', 'Agente', 'Plataforma', 'Tipo', 'Contenido', 'Búsqueda'];
          const csvData = results.map(result => [
            result.createdAt.toLocaleDateString('es-CO'),
            result.createdAt.toLocaleTimeString('es-CO'),
            formatPhoneNumber(result.phone),
            result.userName,
            result.agentName,
            result.platform.charAt(0).toUpperCase() + result.platform.slice(1),
            result.type === 'user' ? 'Usuario' : 'IA',
            `"${result.content.replace(/"/g, '""')}"`,
            `"${result.matchedText}"`
          ]);
          
          const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `busqueda_contenido_${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
        } else {
          const jsonData = results.map(result => ({
            fecha: result.createdAt.toLocaleDateString('es-CO'),
            hora: result.createdAt.toLocaleTimeString('es-CO'),
            telefono: formatPhoneNumber(result.phone),
            usuario: result.userName,
            agente: result.agentName,
            plataforma: result.platform.charAt(0).toUpperCase() + result.platform.slice(1),
            tipo: result.type === 'user' ? 'Usuario' : 'IA',
            contenido: result.content,
            busqueda: result.matchedText,
            timestamp: result.timestamp,
            sessionName: result.sessionName
          }));
          
          const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `busqueda_contenido_${new Date().toISOString().split('T')[0]}.json`;
          link.click();
        }
      },

      // Operaciones asíncronas
      fetchConversations: async (platform?: string) => {
        set({ loading: true, error: null });
        try {
          // Usar el platform del parámetro o el del filtro actual
          const currentFilters = get().filters;
          const platformFilter = platform || currentFilters.platform;
          
          // Obtener datos reales del backend
          const [sessionSummaries, allLogs] = await Promise.all([
            conversationApi.getConversationsGroupedBySession(),
            conversationApi.getAllConversationLogs(platformFilter !== 'all' ? platformFilter : undefined)
          ]);
          
          // Transformar datos del backend al formato del frontend
          const conversations = transformLogsToConversations(sessionSummaries, allLogs);

          // Cargar agentes del usuario una sola vez para mapear sessionName -> agent.name
          const authState = useAuthStore.getState?.() || { user: null };
          const currentUserId = authState.user?.id;
          let agentsList: AgentResponse[] = [];
          const agentsBySession = new Map<string, string>(); // sessionName -> agent.name
          if (currentUserId) {
            try {
              const agentsResp = await agentApi.getAgentsByUser(currentUserId);
              agentsList = agentsResp.data || agentsResp.agents || [];
              // Construir mapa rápido por sessionName si el backend lo provee
              for (const a of agentsList) {
                try {
                  if (a && a.sessionName && typeof a.sessionName === 'string' && a.name) {
                    agentsBySession.set(a.sessionName, a.name);
                  }
                } catch (e) {
                  // ignore malformed agent entries
                }
              }
            } catch (err) {
              console.warn('No se pudieron cargar agentes del usuario para mapear por name:', err);
            }
          }

          set({ conversations, loading: false });

          // NOTA: Comentado temporalmente porque el backend ahora proporciona el agentName correcto
          // Ya no necesitamos resolver nombres de agentes asíncronamente porque vienen del backend
          /*
          // Resolver nombres de agentes asíncronamente
          try {
            const conversationsWithNames = await Promise.all(
              conversations.map(async (conv) => {
                try {
                  // Extraer sessionName del ID de conversación
                  const sessionNameMatch = conv.id.match(/conv-(.+?)-\d+$/);
                  const sessionName = sessionNameMatch ? sessionNameMatch[1] : '';

                  // Buscar un log representativo para esta sesión para extraer candidate y platform
                  const sessionLog = allLogs.find(l => l.sessionName === sessionName);
                  const logExt = sessionLog as unknown as Record<string, unknown> & { botName?: string; platformConfig?: unknown; platform?: string } | undefined;

                  let nameCandidate: string | undefined = undefined;
                  if (logExt) {
                    if (logExt.botName && typeof logExt.botName === 'string') nameCandidate = logExt.botName as string;
                    if (!nameCandidate && logExt.platformConfig) {
                      try {
                        const rawPc = logExt.platformConfig;
                        const pc = typeof rawPc === 'string' ? JSON.parse(rawPc as string) as Record<string, unknown> : rawPc as Record<string, unknown>;
                        if (pc && typeof pc.sessionName === 'string') nameCandidate = pc.sessionName as string;
                        if (pc && typeof pc.botName === 'string') nameCandidate = nameCandidate || (pc.botName as string);
                      } catch (e) {
                        // ignore
                      }
                    }
                  }

                  const platform = (logExt && logExt.platform && (logExt.platform === 'telegram' || logExt.platform === 'whatsapp')) ? (logExt.platform as 'whatsapp' | 'telegram') : conv.platform;

                  // PRIORIDAD 1: Si existe un agente con sessionName en el mapa, usar su campo `name`
                  let resolvedName: string | undefined = undefined;
                  if (sessionName && agentsBySession.has(sessionName)) {
                    resolvedName = agentsBySession.get(sessionName)!;
                  }

                  // PRIORIDAD 2: Intentar emparejar por nameCandidate + platform en la lista cargada
                  if (!resolvedName && nameCandidate && agentsList && agentsList.length > 0) {
                    const matched = agentsList.find(a => a.name === nameCandidate && a.platform === platform);
                    if (matched) resolvedName = matched.name;
                  }

                  // FALLBACK: usar helper para buscar por candidato o sessionName (mantener compatibilidad)
                  if (!resolvedName) {
                    resolvedName = await getAgentNameByCandidate(nameCandidate || sessionName, platform, currentUserId);
                  }

                  if (resolvedName) {
                    return { ...conv, agentName: resolvedName } as Conversation;
                  }

                  return conv;
                } catch (e) {
                  // En caso de error devolvemos la conversación sin cambios
                  console.warn('Error procesando conversación para resolver nombre:', e);
                  return conv;
                }
              })
            );

            // Actualizar el estado con los nombres resueltos
            set({ conversations: conversationsWithNames, loading: false });
          } catch (err) {
            console.error('Error resolviendo nombres de agentes:', err);
          }
          */

        } catch (error) {
          console.error('Error cargando conversaciones:', error);
          set({ error: 'Error al cargar conversaciones', loading: false });
        }
      },

      // Función para refrescar conversaciones (wrapper de fetchConversations)
      refreshConversations: async () => {
        const currentFilters = get().filters;
        const platformFilter = currentFilters.platform !== 'all' ? currentFilters.platform : undefined;
        await get().fetchConversations(platformFilter);
      },

      // fetchMessages: carga mensajes de una conversación (mínimo implementado)
      fetchMessages: async (conversationId: string) => {
        try {
          // Extraer sessionName del conversationId (formato conv-<sessionName>-<index>)
          const match = conversationId.match(/conv-(.+?)-\d+$/);
          const sessionName = match ? match[1] : conversationId;

          // Llamar al API para obtener los logs de la sesión
          const logs = await conversationApi.getConversationLogsBySession(sessionName);

          // Mapear logs a Message[] — incluir tanto userMessage como aiResponse si existen
          const mapped: Message[] = logs.flatMap(l => {
            const items: Message[] = [];
            const ts = new Date(l.createdAt);

            if (l.userMessage && typeof l.userMessage === 'string' && l.userMessage.trim() !== '') {
              items.push({
                id: `${l.id}-user`,
                conversationId,
                content: l.userMessage,
                type: 'text',
                direction: 'incoming',
                timestamp: ts,
                status: 'delivered'
              } as Message);
            }

            if (l.aiResponse && typeof l.aiResponse === 'string' && l.aiResponse.trim() !== '') {
              items.push({
                id: `${l.id}-ai`,
                conversationId,
                content: l.aiResponse,
                type: 'text',
                direction: 'outgoing',
                timestamp: ts,
                status: 'delivered'
              } as Message);
            }

            return items;
          });

          // Ordenar por timestamp ascendente
          mapped.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          set({ messages: { ...get().messages, [conversationId]: mapped } });
        } catch (e) {
          console.error('Error fetchMessages:', e);
          set({ error: 'Error al cargar mensajes' });
        }
      },

      sendMessage: async (conversationId: string, content: string, platform?: string) => {
        // Implementación mínima: añadir mensaje localmente
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          content,
          type: 'text',
          direction: 'outgoing',
          timestamp: new Date(),
          status: 'sent'
        };

        const existing = get().messages[conversationId] || [];
        set({ messages: { ...get().messages, [conversationId]: [...existing, newMsg] } });
      },

      markAsRead: async (conversationId: string) => {
        // Marcar como leído localmente
        set((state) => ({
          conversations: state.conversations.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
        }));
      },

      updateConversationStatus: async (conversationId: string, status: Conversation['status']) => {
        set((state) => ({
          conversations: state.conversations.map(c => c.id === conversationId ? { ...c, status } : c)
        }));
      },

      assignConversation: async (conversationId: string, userId: string) => {
        // Placeholder: no-op local assign
        console.log('assignConversation called', conversationId, userId);
      },

      addTag: async (conversationId: string, tag: string) => {
        set((state) => ({
          conversations: state.conversations.map(c => c.id === conversationId ? { ...c, tags: Array.from(new Set([...c.tags, tag])) } : c)
        }));
      },

      removeTag: async (conversationId: string, tag: string) => {
        set((state) => ({
          conversations: state.conversations.map(c => c.id === conversationId ? { ...c, tags: c.tags.filter(t => t !== tag) } : c)
        }));
      },

      // Filtros
      updateFilters: (newFilters: Partial<ConversationFilter>) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
      },

      // Getters
      getFilteredConversations: () => {
        const state = get();
        let list = state.conversations.slice();
        if (state.filters.platform !== 'all') {
          list = list.filter(c => c.platform === state.filters.platform);
        }
        if (state.filters.status !== 'all') {
          list = list.filter(c => c.status === state.filters.status);
        }
        if (state.filters.agent !== 'all') {
          list = list.filter(c => c.agentName === state.filters.agent);
        }
        return list;
      },

      getConversationStats: () => {
        const conversations = get().conversations;
        const total = conversations.length;
        const active = conversations.filter(c => c.status === 'active').length;
        const resolved = conversations.filter(c => c.status === 'resolved').length;
        const waiting = conversations.filter(c => c.status === 'waiting').length;
        const transferred = conversations.filter(c => c.status === 'transferred').length;
        const avgRespValues = conversations.map(c => c.averageResponseTime || 0).filter(v => v > 0);
        const averageResponseTime = avgRespValues.length > 0 ? Math.round(avgRespValues.reduce((a, b) => a + b, 0) / avgRespValues.length) : 0;
        const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
        return {
          total,
          active,
          resolved,
          waiting,
          transferred,
          averageResponseTime,
          resolutionRate
        } as ConversationStats;
      },

      getUnreadCount: () => {
        return get().conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      }
    })
  )
);
