import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'message' | 'agent_error' | 'system' | 'success' | 'warning';
  title: string;
  message: string;
  agentName?: string;
  agentId?: string;
  conversationId?: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string; // URL para navegar cuando se hace clic
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  lastPollingTimestamp: number | null; // Timestamp del último polling para conversation logs
  conversationNewMessages: Record<string, number>; // sessionName -> count of new messages
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
  setLastPollingTimestamp: (timestamp: number) => void;
  
  // New conversation message tracking
  updateConversationNewMessages: (sessionName: string, increment: number) => void;
  getNewMessagesForSession: (sessionName: string) => number;
  resetNewMessagesForSession: (sessionName: string) => void;
  clearAllConversationNewMessages: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      lastPollingTimestamp: null,
      conversationNewMessages: {},

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          read: false,
        };

        set((state) => {
          const newNotifications = [notification, ...state.notifications];
          const unreadCount = newNotifications.filter(n => !n.read).length;
          
          // Límite de 50 notificaciones
          const limitedNotifications = newNotifications.slice(0, 50);
          
          return {
            notifications: limitedNotifications,
            unreadCount,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          );
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(notification => ({ ...notification, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(notification => notification.id !== id);
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(notification => !notification.read);
      },

      getNotificationsByType: (type) => {
        return get().notifications.filter(notification => notification.type === type);
      },

      setLastPollingTimestamp: (timestamp) => {
        set({ lastPollingTimestamp: timestamp });
      },

      // New conversation message tracking functions
      updateConversationNewMessages: (sessionName, increment) => {
        set((state) => {
          const currentCount = state.conversationNewMessages[sessionName] || 0;
          return {
            conversationNewMessages: {
              ...state.conversationNewMessages,
              [sessionName]: currentCount + increment,
            },
          };
        });
      },

      getNewMessagesForSession: (sessionName) => {
        return get().conversationNewMessages[sessionName] || 0;
      },

      resetNewMessagesForSession: (sessionName) => {
        set((state) => {
          const { [sessionName]: _, ...rest } = state.conversationNewMessages;
          return {
            conversationNewMessages: rest,
          };
        });
      },

      clearAllConversationNewMessages: () => {
        set({ conversationNewMessages: {} });
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        lastPollingTimestamp: state.lastPollingTimestamp,
        conversationNewMessages: state.conversationNewMessages,
      }),
    }
  )
);