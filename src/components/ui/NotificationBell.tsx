import { Bell, Check, X, MessageSquare, AlertTriangle, Info, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'agent_error':
      return AlertTriangle;
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertCircle;
    case 'system':
    default:
      return Info;
  }
};

const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
  if (priority === 'high') {
    return 'text-red-500';
  }
  
  switch (type) {
    case 'message':
      return 'text-blue-500';
    case 'agent_error':
      return 'text-orange-500';
    case 'success':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'system':
    default:
      return 'text-gray-500';
  }
};

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAllNotifications
  } = useNotificationStore();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    markAsRead(notification.id);
    
    // Navegar a la URL de acción si existe
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleRemoveNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    removeNotification(notificationId);
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Borrar todas
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No hay notificaciones</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type, notification.priority);
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex items-start space-x-3 p-3 cursor-pointer transition-colors",
                      !notification.read && "bg-muted/50"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn("mt-0.5", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleRemoveNotification(e, notification.id)}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {notification.agentName && (
                        <p className="text-xs font-medium text-primary">
                          {notification.agentName}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                        
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center"
              onClick={() => navigate('/notifications')}
            >
              Ver todas las notificaciones
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}