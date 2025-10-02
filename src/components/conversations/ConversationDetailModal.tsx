import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Phone, 
  MessageSquare, 
  Clock, 
  User, 
  Tag, 
  Plus,
  CheckCircle2,
  ArrowUpRight,
  Bot,
  Download,
  Image as ImageIcon,
  FileText,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { Conversation, Message } from '@/types/conversation';
import { useConversationStore } from '@/store/conversationStore';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatColombianPhoneNumber } from '@/lib/utils';

interface ConversationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

const platformConfig = {
  whatsapp: {
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    className: 'text-green-600',
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramIcon,
    className: 'text-blue-600',
  },
};

const messageTypeIcons = {
  text: MessageSquare,
  image: ImageIcon,
  audio: Bot, // Placeholder, se puede cambiar por un icono de audio
  document: FileText,
  location: MapPin,
};

function MessageBubble({ message }: { message: Message }) {
  const isOutgoing = message.direction === 'outgoing';
  const Icon = messageTypeIcons[message.type];

  return (
    <div className={cn(
      "flex w-full mb-4",
      isOutgoing ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
        isOutgoing 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <div className="flex items-start space-x-2">
          <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm">{message.content}</div>
            {message.metadata && (
              <div className="text-xs opacity-70 mt-1">
                {message.metadata.fileName && `📎 ${message.metadata.fileName}`}
                {message.metadata.location && `📍 Ubicación compartida`}
              </div>
            )}
            <div className={cn(
              "text-xs mt-1 flex items-center space-x-1",
              isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <span>{format(message.timestamp, 'HH:mm')}</span>
              {isOutgoing && (
                <span className="ml-1">
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationDetailModal({ isOpen, onClose, conversation }: ConversationDetailModalProps) {
  const { messages, fetchMessages, sendMessage, updateConversationStatus, addTag } = useConversationStore();
  const [newMessage, setNewMessage] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const conversationMessages = conversation ? messages[conversation.id] || [] : [];
  const platformInfo = conversation ? platformConfig[conversation.platform] : null;
  const PlatformIcon = platformInfo?.icon;

  useEffect(() => {
    if (conversation && isOpen) {
      fetchMessages(conversation.id);
    }
  }, [conversation, isOpen, fetchMessages]);

  if (!conversation) return null;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(conversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    await addTag(conversation.id, newTag);
    setNewTag('');
  };

  const handleStatusChange = async (status: Conversation['status']) => {
    await updateConversationStatus(conversation.id, status);
  };

  const handleRefreshMessages = async () => {
    if (!conversation || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await fetchMessages(conversation.id);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {/* Solo mostrar el icono de la plataforma, sin avatar */}
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
                  {PlatformIcon && (
                    <PlatformIcon className={`h-8 w-8 ${platformInfo?.className}`} />
                  )}
                </div>
              </div>

              <div>
                <DialogTitle className="text-lg">
                  {conversation.contact.name || 'Usuario anónimo'}
                </DialogTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>{conversation.contact.phone}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bot className="h-3 w-3" />
                    <span>{conversation.agentName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(conversation.updatedAt, { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshMessages}
                disabled={isRefreshing}
                title="Actualizar mensajes"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Badge 
                variant={conversation.status === 'active' ? 'default' : 'outline'}
                className={conversation.status === 'active' ? 'bg-green-500' : ''}
              >
                {conversation.status === 'active' ? 'Activa' :
                 conversation.status === 'resolved' ? 'Resuelta' :
                 conversation.status === 'waiting' ? 'Esperando' :
                 'Transferida'}
              </Badge>

              {conversation.unreadCount > 0 && (
                <Badge variant="destructive">
                  {conversation.unreadCount} sin leer
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4 overflow-hidden">
              <div className="space-y-2">
                {conversationMessages.length > 0 ? (
                  conversationMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No hay mensajes aún</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex space-x-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isSending}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l bg-muted/20 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="p-4 space-y-6">
                {/* Actions */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Acciones</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleStatusChange('resolved')}
                      disabled={conversation.status === 'resolved'}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como resuelta
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleStatusChange('transferred')}
                      disabled={conversation.status === 'transferred'}
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Transferir a humano
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Estadísticas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total mensajes:</span>
                      <span>{conversation.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiempo de respuesta:</span>
                      <span>{Math.round((conversation.averageResponseTime || 0) / 60)}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creada:</span>
                      <span>{format(conversation.createdAt, 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Etiquetas</h3>
                  <div className="space-y-2">
                    {conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Nueva etiqueta"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={handleAddTag}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-3">Información de contacto</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>
                      <p>{conversation.contact.name || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>
                      <p>{formatColombianPhoneNumber(conversation.contact.phone)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Plataforma:</span>
                      <p>{platformInfo?.label}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Primera interacción:</span>
                      <p>{format(conversation.contact.createdAt, "dd 'de' MMMM, yyyy", { locale: es })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
