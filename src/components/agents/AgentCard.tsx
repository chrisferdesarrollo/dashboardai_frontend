import { Agent } from '@/types/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trash2,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { whatsappApi } from '@/services/whatsappApi';
import { telegramApi } from '@/services/telegramApi';
import { agentService } from '@/services/agentApi';
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { WhatsAppConnectionModal } from './WhatsAppConnectionModal';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onView: (agent: Agent) => void;
  onStatusChange?: (agentId: string, newStatus: 'active' | 'inactive' | 'error') => void;
}

const statusConfig = {
  active: {
    label: 'Activo',
    variant: 'default' as const,
    className: 'bg-success text-success-foreground',
  },
  inactive: {
    label: 'Inactivo',
    variant: 'secondary' as const,
    className: 'bg-muted text-muted-foreground',
  },
  error: {
    label: 'Error',
    variant: 'destructive' as const,
    className: 'bg-destructive text-destructive-foreground',
  },
};

// Función helper para obtener configuración de status de forma segura
const getStatusConfig = (status: string) => {
  return statusConfig[status as keyof typeof statusConfig] || {
    label: 'Desconocido',
    variant: 'secondary' as const,
    className: 'bg-muted text-muted-foreground',
  };
};

// Función helper para obtener configuración de plataforma de forma segura
const getPlatformConfig = (platform: string) => {
  return platformConfig[platform as keyof typeof platformConfig] || {
    label: 'Desconocido',
    icon: WhatsAppIcon,
    className: '',
  };
};

const platformConfig = {
  whatsapp: {
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    className: '',
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramIcon,
    className: '',
  },
};

export function AgentCard({ agent, onEdit, onDelete, onView, onStatusChange }: AgentCardProps) {
  console.log('🔄 [AgentCard] Re-rendering:', { id: agent.id, status: agent.status, name: agent.name });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  const statusInfo = getStatusConfig(agent.status);
  const platformInfo = getPlatformConfig(agent.platform);
  
  // La verificación ya no es necesaria gracias a las funciones helper
  const PlatformIcon = platformInfo.icon;

  // Función para conectar WhatsApp (ahora abre el modal)
  const handleConnect = useCallback(() => {
    if (!agent.sessionName || agent.platform !== 'whatsapp') {
      toast({
        title: "Error",
        description: "No se puede conectar: sesión no configurada o no es WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setShowConnectionModal(true);
  }, [agent.sessionName, agent.platform]);

  // Función para desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('🔌 [AgentCard] handleDisconnect iniciado para agente:', { id: agent.id, status: agent.status });
    
    if (!agent.sessionName || agent.platform !== 'whatsapp') {
      toast({
        title: "Error",
        description: "No se puede desconectar: sesión no configurada o no es WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setIsDisconnecting(true);
    
    // Primero actualizar el estado en la base de datos
    try {
      console.log('🔌 [AgentCard] Actualizando estado a inactive...');
      await agentService.updateAgentStatus(agent.id, 'inactive');
      console.log('🔌 [AgentCard] Estado actualizado en backend, llamando onStatusChange...');
      onStatusChange?.(agent.id, 'inactive');
      console.log('🔌 [AgentCard] onStatusChange llamado exitosamente');
      
      toast({
        title: "Estado actualizado",
        description: `Estado del agente ${agent.name} cambiado a desconectado`,
        variant: "default",
      });
      
    } catch (dbError) {
      console.error('❌ [AgentCard] Error actualizando estado del agente en BD:', dbError);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del agente",
        variant: "destructive",
      });
      setIsDisconnecting(false);
      return;
    }

    // Luego intentar desconectar WhatsApp (opcional)
    try {
      console.log('🔌 [AgentCard] Intentando desconectar sesión de WhatsApp...');
      const result = await whatsappApi.disconnectWhatsAppSession(agent.sessionName);
      console.log('🔌 [AgentCard] Resultado de desconexión WhatsApp:', result);
      
      if (result.success) {
        setConnectionStatus('disconnected');
        console.log('✅ [AgentCard] WhatsApp desconectado exitosamente');
      } else {
        console.warn('⚠️ [AgentCard] WhatsApp no se pudo desconectar, pero estado actualizado en BD');
      }
    } catch (whatsappError) {
      console.warn('⚠️ [AgentCard] Error desconectando WhatsApp (estado ya actualizado en BD):', whatsappError);
      // No mostramos error al usuario porque lo importante (actualizar estado) ya se hizo
    }

    setIsDisconnecting(false);
  }, [agent.sessionName, agent.platform, agent.id, agent.name, agent.status, onStatusChange]);

  // Función para conectar agente de Telegram
  const handleConnectTelegram = useCallback(async () => {
    console.log('🔌 [TELEGRAM-CONNECT] handleConnectTelegram iniciado para agente:', { id: agent.id, status: agent.status });
    
    if (agent.platform !== 'telegram') {
      toast({
        title: "Error",
        description: "Esta función solo está disponible para agentes de Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Primero actualizar el estado en el backend
      console.log('🔌 [TELEGRAM-CONNECT] Actualizando estado del agente en backend...');
      await agentService.connectTelegramAgent(agent.id);
      console.log('🔌 [TELEGRAM-CONNECT] Estado actualizado en backend, llamando onStatusChange...');
      onStatusChange?.(agent.id, 'active');
      console.log('🔌 [TELEGRAM-CONNECT] onStatusChange llamado exitosamente');
      
      // Luego activar el bot en el webhook de n8n
      try {
        console.log('🔌 [TELEGRAM-CONNECT] Obteniendo botToken del agente...');
        const botToken = await agentService.getTelegramBotToken(agent.id);
        console.log('🔌 [TELEGRAM-CONNECT] BotToken obtenido, activando bot en webhook...');
        const result = await telegramApi.connectTelegramAgent(botToken);
        console.log('🔌 [TELEGRAM-CONNECT] Resultado de activación del webhook:', result);
        
        toast({
          title: "Agente conectado",
          description: `${agent.name} se ha conectado exitosamente`,
          variant: "default",
        });
      } catch (webhookError) {
        console.warn('⚠️ [TELEGRAM-CONNECT] Error activando bot en webhook (estado ya actualizado):', webhookError);
        toast({
          title: "Agente conectado",
          description: `${agent.name} se ha conectado (sin activación del bot)`,
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('❌ [TELEGRAM-CONNECT] Error conectando agente:', error);
      toast({
        title: "Error",
        description: "No se pudo conectar el agente de Telegram",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [agent.platform, agent.id, agent.name, agent.status, onStatusChange]);

  // Función para desconectar agente de Telegram
  const handleDisconnectTelegram = useCallback(async () => {
    console.log('🔌 [TELEGRAM-DISCONNECT] handleDisconnectTelegram iniciado para agente:', { id: agent.id, status: agent.status });
    
    if (agent.platform !== 'telegram') {
      toast({
        title: "Error",
        description: "Esta función solo está disponible para agentes de Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsDisconnecting(true);
    
    try {
      // Primero actualizar el estado en el backend
      console.log('🔌 [TELEGRAM-DISCONNECT] Actualizando estado del agente en backend...');
      await agentService.disconnectTelegramAgent(agent.id);
      console.log('🔌 [TELEGRAM-DISCONNECT] Estado actualizado en backend, llamando onStatusChange...');
      onStatusChange?.(agent.id, 'inactive');
      console.log('🔌 [TELEGRAM-DISCONNECT] onStatusChange llamado exitosamente');
      
      // Luego enviar comando /stop al webhook
      try {
        console.log('🔌 [TELEGRAM-DISCONNECT] Obteniendo botToken del agente...');
        const botToken = await agentService.getTelegramBotToken(agent.id);
        console.log('🔌 [TELEGRAM-DISCONNECT] BotToken obtenido, enviando comando /stop al webhook...');
        const result = await telegramApi.disconnectTelegramAgent(botToken);
        console.log('🔌 [TELEGRAM-DISCONNECT] Resultado de desconexión del webhook:', result);
        
        toast({
          title: "Agente desconectado",
          description: `${agent.name} se ha desconectado exitosamente`,
          variant: "default",
        });
      } catch (webhookError) {
        console.warn('⚠️ [TELEGRAM-DISCONNECT] Error enviando /stop al webhook (estado ya actualizado):', webhookError);
        toast({
          title: "Agente desconectado",
          description: `${agent.name} se ha desconectado (sin notificación al bot)`,
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('❌ [TELEGRAM-DISCONNECT] Error desconectando agente:', error);
      toast({
        title: "Error",
        description: "No se pudo desconectar el agente de Telegram",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }, [agent.platform, agent.id, agent.name, agent.status, onStatusChange]);

  return (
    <Card className="group hover:shadow-soft transition-all duration-200 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <PlatformIcon className={platformInfo.className} size={20} />
              <CardTitle className="text-lg leading-none hover:text-primary cursor-pointer transition-colors"
                        onClick={() => onView(agent)}>
                {agent.name}
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {agent.description}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>en {platformInfo.label}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ejecuciones:</span>
            <span className="font-medium">{agent.totalExecutions}</span>
          </div>
          
          {agent.lastExecution && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Última:</span>
              <span className="font-medium text-xs">
                {formatDistanceToNow(agent.lastExecution, { 
                  addSuffix: true, 
                  locale: es 
                })}
              </span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="space-y-2">
          {/* Botón de conexión para WhatsApp basado en el estado */}
          {agent.platform === 'whatsapp' && agent.sessionName && (
            <div className="flex items-center gap-2">
              {agent.status === 'active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center space-x-1 flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950 dark:hover:border-orange-700 dark:hover:text-orange-300"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center space-x-1 flex-1 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950 dark:hover:border-green-700 dark:hover:text-green-300"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wifi className="h-3 w-3" />
                  )}
                  <span>{isConnecting ? 'Conectando...' : 'Conectar WhatsApp'}</span>
                </Button>
              )}
            </div>
          )}
          
          {/* Botón de conexión para Telegram basado en el estado */}
          {agent.platform === 'telegram' && (
            <div className="flex items-center gap-2">
              {agent.status === 'active' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectTelegram}
                  disabled={isDisconnecting}
                  className="flex items-center space-x-1 flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950 dark:hover:border-orange-700 dark:hover:text-orange-300"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar Telegram'}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectTelegram}
                  disabled={isConnecting}
                  className="flex items-center space-x-1 flex-1 border border-[#0088CC] text-[#0088CC] hover:bg-[#0088CC]/10 hover:border-[#0077B3] hover:text-[#0077B3] dark:border-[#64B5F6] dark:text-[#64B5F6] dark:hover:bg-[#0088CC]/20 dark:hover:border-[#0088CC] dark:hover:text-[#0088CC]"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wifi className="h-3 w-3" />
                  )}
                  <span>{isConnecting ? 'Conectando...' : 'Conectar Telegram'}</span>
                </Button>
              )}
            </div>
          )}
          
          {/* Botones principales */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onView(agent)}
              className="flex-1 mr-2"
            >
              Ver Detalles
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(agent.id)}
              className="flex items-center space-x-1 min-w-[100px]"
            >
              <Trash2 className="h-3 w-3" />
              <span>Eliminar</span>
            </Button>
          </div>
        </div>

        {/* Modal de conexión WhatsApp */}
        <WhatsAppConnectionModal
          isOpen={showConnectionModal}
          onClose={() => setShowConnectionModal(false)}
          agent={agent}
          onStatusChange={onStatusChange || (() => {})}
        />
      </CardContent>
    </Card>
  );
}