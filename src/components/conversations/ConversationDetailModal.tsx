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
  const isFromUser = !isOutgoing; // El mensaje entrante es del usuario

  return (
    <div className={cn(
      "flex w-full mb-3",
      isOutgoing ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex items-end space-x-2 max-w-[80%]",
        isOutgoing ? "flex-row-reverse space-x-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
          <AvatarFallback className={cn(
            "text-xs",
            isFromUser 
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
              : "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
          )}>
            {isFromUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Nube del mensaje */}
        <div className="relative">
          {/* Cola de la nube - posicionada para "nacer" del avatar */}
          <div className={cn(
            "absolute bottom-2 w-4 h-4 transform",
            isFromUser 
              ? "left-[-8px] bg-background/95 dark:bg-card/95 border-l border-b border-border dark:border-border rotate-45"
              : "right-[-8px] bg-green-100/95 dark:bg-green-950/30 border-r border-b border-green-200 dark:border-green-800/50 rotate-45"
          )} />
          
          {/* Contenido de la nube */}
          <div className={cn(
            "relative rounded-2xl px-4 py-3 shadow-sm border backdrop-blur-sm",
            isFromUser 
              ? "bg-background/95 dark:bg-card/95 border-border dark:border-border rounded-bl-sm" // Usuario: esquina inferior izquierda más cuadrada
              : "bg-green-100/95 dark:bg-green-950/30 border-green-200 dark:border-green-800/50 rounded-br-sm" // Agente: esquina inferior derecha más cuadrada
          )}>
            {/* Contenido del mensaje */}
            <div className="text-sm leading-relaxed text-foreground mb-1">
              {message.content}
            </div>
            
            {/* Metadata del mensaje */}
            {message.metadata && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded-md">
                {message.metadata.fileName && (
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{message.metadata.fileName}</span>
                  </div>
                )}
                {message.metadata.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>Ubicación compartida</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Timestamp y estado */}
            <div className={cn(
              "flex items-center mt-1 space-x-1",
              isOutgoing ? "justify-end" : "justify-start"
            )}>
              <span className="text-xs text-muted-foreground/70">
                {format(message.timestamp, 'HH:mm')}
              </span>
              {isOutgoing && (
                <div className="text-xs">
                  {message.status === 'sent' && <span className="text-muted-foreground/60">✓</span>}
                  {message.status === 'delivered' && <span className="text-blue-500">✓✓</span>}
                  {message.status === 'read' && <span className="text-green-500">✓✓</span>}
                </div>
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
                    <span>{formatColombianPhoneNumber(conversation.contact.phone?.replace(/@s\.whatsapp\.net$/, ''))}</span>
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
            <ScrollArea className="flex-1 p-6 overflow-hidden bg-gradient-to-b from-background to-muted/10">
              <div className="space-y-4">
                {conversationMessages.length > 0 ? (
                  conversationMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">No hay mensajes aún</p>
                    <p className="text-muted-foreground/70 text-sm mt-1">
                      Los mensajes aparecerán aquí cuando se inicie la conversación
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t bg-background/95 backdrop-blur-sm p-4 flex-shrink-0">
              <div className="flex space-x-3">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                  className="px-4"
                >
                  {isSending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
