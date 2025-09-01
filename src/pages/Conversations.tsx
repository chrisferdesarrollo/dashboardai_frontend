import { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical, MessageSquare, Users, CheckCircle2, Clock, ArrowUpRight, Phone, Tag, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConversationStore } from '@/store/conversationStore';
import { Conversation } from '@/types/conversation';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConversationDetailModal } from '@/components/conversations/ConversationDetailModal';

const statusConfig = {
  active: {
    label: 'Activa',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: MessageSquare,
  },
  resolved: {
    label: 'Resuelta',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: CheckCircle2,
  },
  waiting: {
    label: 'Esperando',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
  },
  transferred: {
    label: 'Transferida',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: ArrowUpRight,
  },
};

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

function ConversationCard({ conversation, onSelect }: { conversation: Conversation; onSelect: (conversation: Conversation) => void }) {
  const { updateConversationStatus, markAsRead } = useConversationStore();
  const statusInfo = statusConfig[conversation.status];
  const platformInfo = platformConfig[conversation.platform];
  const PlatformIcon = platformInfo.icon;
  const StatusIcon = statusInfo.icon;

  const handleStatusChange = async (newStatus: Conversation['status']) => {
    await updateConversationStatus(conversation.id, newStatus);
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(conversation.id);
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
      onClick={() => onSelect(conversation)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversation.contact.avatar} />
                <AvatarFallback className="bg-primary/10">
                  {/* Initials removed as requested */}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <PlatformIcon className={`h-4 w-4 ${platformInfo.className}`} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-sm truncate">
                  {conversation.contact.name || 'Usuario anónimo'}
                </h3>
                {conversation.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{conversation.contact.phone}</span>
                <span>•</span>
                <span>{conversation.agentName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge className={statusInfo.className}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation.unreadCount > 0 && (
                  <DropdownMenuItem onClick={handleMarkAsRead}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Marcar como leída
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como resuelta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('transferred')}>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Transferir a humano
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Reabrir conversación
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {conversation.lastMessage && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {conversation.lastMessage.direction === 'incoming' ? '👤 ' : '🤖 '}
              {conversation.lastMessage.content}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(conversation.lastMessage.timestamp, { 
                  addSuffix: true, 
                  locale: es 
                })}
              </span>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{conversation.totalMessages}</span>
              </div>
            </div>
          </div>
        )}

        {conversation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {conversation.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {conversation.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{conversation.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {conversation.assignedTo && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
            <UserCheck className="h-3 w-3" />
            <span>Asignada a: {conversation.assignedTo}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Conversations() {
  const { toast } = useToast();
  const {
    getFilteredConversations,
    getConversationStats,
    getUnreadCount,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    loading,
    fetchConversations,
    error,
  } = useConversationStore();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const conversations = getFilteredConversations();
  const stats = getConversationStats();
  const unreadCount = getUnreadCount();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowDetailModal(true);
  };

  const statCards = [
    {
      title: 'Total',
      value: stats.total,
      description: 'Conversaciones totales',
      icon: MessageSquare,
      color: 'text-blue-600',
    },
    {
      title: 'Activas',
      value: stats.active,
      description: 'Conversaciones activas',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Sin leer',
      value: unreadCount,
      description: 'Mensajes sin leer',
      icon: MessageSquare,
      color: 'text-red-600',
    },
    {
      title: 'Tiempo promedio',
      value: `${Math.round(stats.averageResponseTime / 60)}min`,
      description: 'Tiempo de respuesta',
      icon: Clock,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
          <p className="text-muted-foreground">
            Gestiona las conversaciones de tus agentes de IA
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, teléfono o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filters.status} onValueChange={(value: 'all' | 'active' | 'resolved' | 'waiting' | 'transferred') => setFilters({ status: value })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="resolved">Resueltas</SelectItem>
              <SelectItem value="waiting">Esperando</SelectItem>
              <SelectItem value="transferred">Transferidas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.platform} onValueChange={(value: 'all' | 'whatsapp' | 'telegram') => setFilters({ platform: value })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de conversaciones */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <MessageSquare className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error al cargar conversaciones</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchConversations()}>
            Reintentar
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <MessageSquare className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No se encontraron conversaciones</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filters.status !== 'all' || filters.platform !== 'all'
              ? 'Ajusta los filtros para ver más resultados' 
              : 'Las conversaciones aparecerán aquí cuando tus agentes empiecen a recibir mensajes'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onSelect={handleSelectConversation}
            />
          ))}
        </div>
      )}

      {/* Modal de detalle de conversación */}
      <ConversationDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedConversation(null);
        }}
        conversation={selectedConversation}
      />
    </div>
  );
}
