// Tipos para las conversaciones de WhatsApp/Telegram
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  direction: 'incoming' | 'outgoing';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface Contact {
  id: string;
  name?: string;
  phone: string;
  avatar?: string;
  platformId: string; // WhatsApp ID, Telegram chat ID, etc.
  platform: 'whatsapp' | 'telegram';
  isBlocked: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  contact: Contact;
  lastMessage?: Message;
  unreadCount: number;
  status: 'active' | 'resolved' | 'waiting' | 'transferred';
  assignedTo?: string; // Usuario asignado
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  platform: 'whatsapp' | 'telegram';
  totalMessages: number;
  averageResponseTime?: number; // en segundos
}

export interface ConversationStats {
  total: number;
  active: number;
  resolved: number;
  waiting: number;
  transferred: number;
  averageResponseTime: number;
  resolutionRate: number;
}

export interface ConversationFilter {
  status: 'all' | 'active' | 'resolved' | 'waiting' | 'transferred';
  platform: 'all' | 'whatsapp' | 'telegram';
  agent: 'all' | string;
  assignedTo: 'all' | 'me' | 'unassigned' | string;
  dateRange: {
    from: Date;
    to: Date;
  };
  tags: string[];
}
