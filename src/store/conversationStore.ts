import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Conversation, ConversationStats, ConversationFilter, Message } from '@/types/conversation';
import conversationApi, { ConversationLogResponse, ConversationSessionSummary } from '@/services/conversationApi';

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
    
    // Detectar plataforma basada en el teléfono
    const platform = lastLog?.userPhone?.includes('@c.us') ? 'whatsapp' : 'telegram';
    
    return {
      id: conversationId,
      agentId: 'agent-1', // TODO: obtener del sessionName o mapear desde agentes
      agentName: 'Bot IA', // TODO: obtener nombre real del agente
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
  
  // Setters básicos
  setConversations: (conversations: Conversation[]) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (searchTerm: string) => void;
  setFilters: (filters: Partial<ConversationFilter>) => void;
  
  // Operaciones
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  updateConversationStatus: (conversationId: string, status: Conversation['status']) => Promise<void>;
  assignConversation: (conversationId: string, userId: string) => Promise<void>;
  addTag: (conversationId: string, tag: string) => Promise<void>;
  removeTag: (conversationId: string, tag: string) => Promise<void>;
  
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
      setFilters: (newFilters) => 
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        })),

      // Operaciones asíncronas
      fetchConversations: async () => {
        set({ loading: true, error: null });
        try {
          // Obtener datos reales del backend
          const [sessionSummaries, allLogs] = await Promise.all([
            conversationApi.getConversationsGroupedBySession(),
            conversationApi.getAllConversationLogs()
          ]);
          
          // Transformar datos del backend al formato del frontend
          const conversations = transformLogsToConversations(sessionSummaries, allLogs);
          
          set({ conversations, loading: false });
        } catch (error) {
          console.error('Error fetching conversations:', error);
          
          // En caso de error, usar datos mock como fallback
          const mockConversations: Conversation[] = [
            {
              id: '1',
              agentId: 'agent-1',
              agentName: 'Bot Ventas',
              contact: {
                id: 'contact-1',
                name: 'Juan Pérez',
                phone: '+521234844390',
                platformId: '5215551234567@c.us',
                platform: 'whatsapp',
                isBlocked: false,
                lastActivity: new Date(Date.now() - 30 * 60 * 1000),
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
              },
              lastMessage: {
                id: 'msg-1',
                conversationId: '1',
                content: 'Hola, me interesa conocer más sobre sus productos',
                type: 'text',
                direction: 'incoming',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                status: 'delivered'
              },
              unreadCount: 2,
              status: 'active',
              tags: ['nuevo-cliente', 'productos'],
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
              updatedAt: new Date(Date.now() - 30 * 60 * 1000),
              platform: 'whatsapp',
              totalMessages: 5,
              averageResponseTime: 120
            },
            {
              id: '2',
              agentId: 'agent-1',
              agentName: 'Bot Ventas',
              contact: {
                id: 'contact-2',
                name: 'María García',
                phone: '+521234844391',
                platformId: '5215551234568@c.us',
                platform: 'whatsapp',
                isBlocked: false,
                lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
              },
              lastMessage: {
                id: 'msg-2',
                conversationId: '2',
                content: '¿Tienen descuentos disponibles?',
                type: 'text',
                direction: 'incoming',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                status: 'read'
              },
              unreadCount: 0,
              status: 'resolved',
              tags: ['descuentos', 'resuelto'],
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              platform: 'whatsapp',
              totalMessages: 8,
              averageResponseTime: 90
            }
          ];
          
          set({ 
            conversations: mockConversations, 
            loading: false,
            error: error instanceof Error ? error.message : 'Error al cargar conversaciones'
          });
        }
      },

      fetchMessages: async (conversationId: string) => {
        try {
          // Extraer sessionName del conversationId
          const sessionName = conversationId.replace('conv-', '').split('-')[0];
          
          // Obtener logs reales de la sesión desde el backend
          const logs = await conversationApi.getConversationLogsBySession(sessionName);
          
          // Transformar logs en mensajes del frontend
          const messages: Message[] = [];
          
          logs.forEach(log => {
            // Agregar mensaje del usuario si existe
            if (log.userMessage) {
              messages.push({
                id: `${log.id}-user`,
                conversationId,
                content: log.userMessage,
                type: 'text',
                direction: 'incoming',
                timestamp: new Date(log.createdAt),
                status: 'delivered'
              });
            }
            
            // Agregar respuesta de la IA si existe
            if (log.aiResponse) {
              messages.push({
                id: `${log.id}-ai`,
                conversationId,
                content: log.aiResponse,
                type: 'text',
                direction: 'outgoing',
                timestamp: new Date(log.timestamp || log.createdAt),
                status: 'read'
              });
            }
          });
          
          // Ordenar mensajes por timestamp
          messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          get().setMessages(conversationId, messages);
        } catch (error) {
          console.error('Error fetching messages:', error);
          
          // Fallback a datos mock en caso de error
          const mockMessages: Message[] = [
            {
              id: 'msg-1-1',
              conversationId,
              content: 'Hola, me interesa conocer más sobre sus productos',
              type: 'text',
              direction: 'incoming',
              timestamp: new Date(Date.now() - 60 * 60 * 1000),
              status: 'delivered'
            },
            {
              id: 'msg-1-2',
              conversationId,
              content: '¡Hola! Me da mucho gusto saludarte. Te ayudo a conocer nuestros productos. ¿Hay algún producto específico que te interese?',
              type: 'text',
              direction: 'outgoing',
              timestamp: new Date(Date.now() - 55 * 60 * 1000),
              status: 'read'
            },
            {
              id: 'msg-1-3',
              conversationId,
              content: 'Estoy buscando laptops para mi negocio',
              type: 'text',
              direction: 'incoming',
              timestamp: new Date(Date.now() - 50 * 60 * 1000),
              status: 'delivered'
            }
          ];
          
          get().setMessages(conversationId, mockMessages);
          set({ error: 'Error al cargar mensajes' });
        }
      },

      sendMessage: async (conversationId: string, content: string) => {
        try {
          // TODO: Implementar envío real
          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            conversationId,
            content,
            type: 'text',
            direction: 'outgoing',
            timestamp: new Date(),
            status: 'sent'
          };

          const currentMessages = get().messages[conversationId] || [];
          get().setMessages(conversationId, [...currentMessages, newMessage]);
        } catch (error) {
          console.error('Error sending message:', error);
          set({ error: 'Error al enviar mensaje' });
        }
      },

      markAsRead: async (conversationId: string) => {
        try {
          // TODO: Implementar llamada a API
          const conversations = get().conversations.map(conv =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          );
          set({ conversations });
        } catch (error) {
          console.error('Error marking as read:', error);
        }
      },

      updateConversationStatus: async (conversationId: string, status: Conversation['status']) => {
        try {
          // TODO: Implementar llamada a API
          const conversations = get().conversations.map(conv =>
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  status, 
                  resolvedAt: status === 'resolved' ? new Date() : conv.resolvedAt 
                } 
              : conv
          );
          set({ conversations });
        } catch (error) {
          console.error('Error updating status:', error);
          set({ error: 'Error al actualizar estado' });
        }
      },

      assignConversation: async (conversationId: string, userId: string) => {
        try {
          // TODO: Implementar llamada a API
          const conversations = get().conversations.map(conv =>
            conv.id === conversationId ? { ...conv, assignedTo: userId } : conv
          );
          set({ conversations });
        } catch (error) {
          console.error('Error assigning conversation:', error);
          set({ error: 'Error al asignar conversación' });
        }
      },

      addTag: async (conversationId: string, tag: string) => {
        try {
          // TODO: Implementar llamada a API
          const conversations = get().conversations.map(conv =>
            conv.id === conversationId && !conv.tags.includes(tag)
              ? { ...conv, tags: [...conv.tags, tag] }
              : conv
          );
          set({ conversations });
        } catch (error) {
          console.error('Error adding tag:', error);
          set({ error: 'Error al agregar etiqueta' });
        }
      },

      removeTag: async (conversationId: string, tag: string) => {
        try {
          // TODO: Implementar llamada a API
          const conversations = get().conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, tags: conv.tags.filter(t => t !== tag) }
              : conv
          );
          set({ conversations });
        } catch (error) {
          console.error('Error removing tag:', error);
          set({ error: 'Error al remover etiqueta' });
        }
      },

      // Getters
      getFilteredConversations: () => {
        const { conversations, searchTerm, filters } = get();
        
        return conversations.filter(conv => {
          // Filtro de búsqueda
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
              conv.contact.name?.toLowerCase().includes(searchLower) ||
              conv.contact.phone.includes(searchTerm) ||
              conv.lastMessage?.content.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
          }

          // Filtro de estado
          if (filters.status !== 'all' && conv.status !== filters.status) {
            return false;
          }

          // Filtro de plataforma
          if (filters.platform !== 'all' && conv.platform !== filters.platform) {
            return false;
          }

          // Filtro de agente
          if (filters.agent !== 'all' && conv.agentId !== filters.agent) {
            return false;
          }

          // Filtro de asignación
          if (filters.assignedTo !== 'all') {
            if (filters.assignedTo === 'unassigned' && conv.assignedTo) {
              return false;
            }
            if (filters.assignedTo === 'me') {
              // TODO: Implementar check de usuario actual
            }
            if (filters.assignedTo !== 'me' && filters.assignedTo !== 'unassigned' && conv.assignedTo !== filters.assignedTo) {
              return false;
            }
          }

          // Filtro de fecha
          const convDate = new Date(conv.updatedAt);
          if (convDate < filters.dateRange.from || convDate > filters.dateRange.to) {
            return false;
          }

          // Filtro de etiquetas
          if (filters.tags.length > 0) {
            const hasTag = filters.tags.some(tag => conv.tags.includes(tag));
            if (!hasTag) return false;
          }

          return true;
        });
      },

      getConversationStats: () => {
        const conversations = get().conversations;
        const total = conversations.length;
        const active = conversations.filter(c => c.status === 'active').length;
        const resolved = conversations.filter(c => c.status === 'resolved').length;
        const waiting = conversations.filter(c => c.status === 'waiting').length;
        const transferred = conversations.filter(c => c.status === 'transferred').length;

        const responseTimesSum = conversations
          .filter(c => c.averageResponseTime)
          .reduce((sum, c) => sum + (c.averageResponseTime || 0), 0);
        
        const averageResponseTime = responseTimesSum / conversations.filter(c => c.averageResponseTime).length || 0;
        const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

        return {
          total,
          active,
          resolved,
          waiting,
          transferred,
          averageResponseTime,
          resolutionRate
        };
      },

      getUnreadCount: () => {
        const conversations = get().conversations;
        return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      }
    }),
    {
      name: 'conversation-store'
    }
  )
);
