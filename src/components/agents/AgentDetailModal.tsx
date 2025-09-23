import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Agent } from '@/types/agent';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  Calendar,
  Activity,
  FileText,
  Copy,
  Check,
  MessageSquare
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useConversationStore } from '@/store/conversationStore';

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const statusConfig = {
  active: {
    label: 'Activo',
    className: 'bg-success text-success-foreground',
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-muted text-muted-foreground',
  },
  error: {
    label: 'Error',
    className: 'bg-destructive text-destructive-foreground',
  },
};

const platformConfig = {
  whatsapp: {
    label: 'WhatsApp',
    icon: WhatsAppIcon,
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramIcon,
  },
};

export function AgentDetailModal({ isOpen, onClose, agent }: AgentDetailModalProps) {
  const { toast } = useToast();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  // Obtener conversaciones del store
  const { conversations } = useConversationStore();
  
  // Función para contar conversaciones del agente
  const getAgentConversationsCount = () => {
    if (!agent) return 0;
    return conversations.filter(conv => 
      conv.agentName === agent.name || 
      conv.agentId === agent.id ||
      conv.agentName.toLowerCase().includes(agent.name.toLowerCase())
    ).length;
  };

  // Debug: Log agent data
  console.log('🔍 [AgentDetailModal] Agent data:', agent);
  console.log('🔍 [AgentDetailModal] Agent prompt específicamente:', agent?.prompt);

  if (!agent) return null;

  const statusInfo = statusConfig[agent.status as keyof typeof statusConfig] || {
    label: 'Desconocido',
    className: 'bg-muted text-muted-foreground',
  };

  const platformInfo = platformConfig[agent.platform as keyof typeof platformConfig] || {
    label: 'Desconocido',
    icon: WhatsAppIcon,
  };

  const PlatformIcon = platformInfo.icon;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(agent.prompt || '');
      setCopiedPrompt(true);
      toast({
        title: 'Prompt copiado',
        description: 'El prompt se ha copiado al portapapeles',
      });
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el prompt',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <PlatformIcon size={24} />
            {agent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Estado y Plataforma
                </h3>
                <div className="flex items-center gap-3">
                  <Badge className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    en {platformInfo.label}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Descripción
                </h3>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {agent.description || 'Sin descripción'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Estadísticas */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Estadísticas
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm">Conversaciones totales</span>
                    </div>
                    <span className="font-semibold">{getAgentConversationsCount()}</span>
                  </div>

                  {agent.lastExecution && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm">Última ejecución</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(agent.lastExecution, { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm">Fecha de creación</span>
                    </div>
                    <span className="text-sm font-medium">
                      {format(agent.createdAt, "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>

                  {agent.updatedAt && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Última actualización</span>
                      </div>
                      <span className="text-sm font-medium">
                        {format(agent.updatedAt, "dd 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Prompt del Agente
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
                className="flex items-center gap-2"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {agent.prompt || 'Sin prompt configurado'}
              </pre>
            </div>
          </div>

          {/* Configuración de plataforma (si existe) */}
          {agent.platformConfig && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Configuración de Plataforma
                </h3>
                <div className="space-y-3">
                  {(() => {
                    try {
                      const config = typeof agent.platformConfig === 'string' 
                        ? JSON.parse(agent.platformConfig) 
                        : agent.platformConfig;
                      
                      console.log('🔧 [AgentDetailModal] Parsed platformConfig:', config);
                      
                      if (agent.platform === 'whatsapp' && config) {
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            {config.businessType && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Tipo de negocio</span>
                                <Badge variant="outline">
                                  {config.businessType === 'retail' ? 'Venta al por menor' :
                                   config.businessType === 'restaurant' ? 'Restaurante' :
                                   config.businessType === 'service' ? 'Servicio' :
                                   config.businessType === 'ecommerce' ? 'E-commerce' :
                                   config.businessType}
                                </Badge>
                              </div>
                            )}
                            {config.conversationalGoal && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Objetivo conversacional</span>
                                <Badge variant="outline">
                                  {config.conversationalGoal === 'sales' ? '💰 Ventas' :
                                   config.conversationalGoal === 'reservations' ? '📅 Reservas' :
                                   config.conversationalGoal === 'support' ? '🛠️ Soporte' :
                                   config.conversationalGoal === 'lead_generation' ? '🎯 Leads' :
                                   config.conversationalGoal}
                                </Badge>
                              </div>
                            )}
                            {config.targetAudience && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Audiencia objetivo</span>
                                <span className="text-sm">{config.targetAudience}</span>
                              </div>
                            )}
                            {config.businessInfo && (
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium block mb-2">Información del negocio</span>
                                <p className="text-sm text-muted-foreground">{config.businessInfo}</p>
                              </div>
                            )}
                            
                            {/* Configuraciones avanzadas si existen */}
                            {config.responseDelay && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Retraso de respuesta</span>
                                <span className="text-sm">{config.responseDelay}ms</span>
                              </div>
                            )}
                            {config.maxResponseLength && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Longitud máxima de respuesta</span>
                                <span className="text-sm">{config.maxResponseLength} caracteres</span>
                              </div>
                            )}
                            {config.useTypingIndicator !== undefined && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Indicador de escritura</span>
                                <Badge variant={config.useTypingIndicator ? 'default' : 'secondary'}>
                                  {config.useTypingIndicator ? 'Activado' : 'Desactivado'}
                                </Badge>
                              </div>
                            )}
                            {config.autoReply !== undefined && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Respuesta automática</span>
                                <Badge variant={config.autoReply ? 'default' : 'secondary'}>
                                  {config.autoReply ? 'Activada' : 'Desactivada'}
                                </Badge>
                              </div>
                            )}
                            {config.businessHours && (
                              <>
                                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                  <span className="text-sm font-medium">Horario de atención</span>
                                  <Badge variant={config.businessHours.enabled ? 'default' : 'secondary'}>
                                    {config.businessHours.enabled ? 'Configurado' : 'Sin configurar'}
                                  </Badge>
                                </div>
                                {config.businessHours.enabled && (
                                  <>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg ml-4">
                                      <span className="text-xs font-medium">Horario</span>
                                      <span className="text-xs">
                                        {config.businessHours.start} - {config.businessHours.end}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg ml-4">
                                      <span className="text-xs font-medium">Zona horaria</span>
                                      <span className="text-xs">{config.businessHours.timezone}</span>
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        );
                      } else if (agent.platform === 'telegram' && config) {
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            {config.botToken && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Token del Bot</span>
                                <span className="text-sm font-mono">***...{config.botToken.slice(-8)}</span>
                              </div>
                            )}
                            {config.allowedUpdates && (
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Tipos de mensaje</span>
                                <span className="text-sm">{config.allowedUpdates.length} configurados</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Fallback: mostrar configuración disponible (excluyendo campos técnicos)
                      const technicalFields = ['sessionName', 'isConnected', 'connectedAt', 'timestamp'];
                      const filteredConfig = Object.entries(config).filter(([key]) => !technicalFields.includes(key));
                      
                      return (
                        <div className="grid grid-cols-1 gap-3">
                          {filteredConfig.map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                              <span className="text-sm font-medium">{key}</span>
                              <span className="text-sm">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    } catch (error) {
                      console.error('❌ [AgentDetailModal] Error parsing platformConfig:', error);
                      return (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            Error al cargar la configuración de plataforma
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
