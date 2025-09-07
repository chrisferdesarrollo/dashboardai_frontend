import { Agent } from '@/types/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trash2,
  Clock,
  Activity
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onView: (agent: Agent) => void;
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

export function AgentCard({ agent, onEdit, onDelete, onView }: AgentCardProps) {
  const statusInfo = getStatusConfig(agent.status);
  const platformInfo = getPlatformConfig(agent.platform);
  
  // La verificación ya no es necesaria gracias a las funciones helper
  const PlatformIcon = platformInfo.icon;

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
        <div className="flex items-center justify-between pt-2">
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
      </CardContent>
    </Card>
  );
}