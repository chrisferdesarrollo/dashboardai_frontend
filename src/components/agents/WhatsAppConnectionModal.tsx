import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/platform-icons';
import { Loader2, CheckCircle, QrCode, Smartphone, RefreshCw, X } from 'lucide-react';
import { Agent } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { whatsappApi } from '@/services/whatsappApi';
import { useAgentStore } from '@/store/agentStore';

interface WhatsAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onStatusChange: (agentId: string, newStatus: 'active' | 'inactive' | 'error') => void;
}

interface WhatsAppSession {
  sessionName: string;
  qrCode: string;
  isConnected: boolean;
  timestamp: string;
}

export function WhatsAppConnectionModal({ 
  isOpen, 
  onClose, 
  agent, 
  onStatusChange 
}: WhatsAppConnectionModalProps) {
  const { toast } = useToast();
  const { updateAgentStatus } = useAgentStore();
  
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const [connectionStep, setConnectionStep] = useState<'generating' | 'scanning' | 'connected' | 'error'>('generating');

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, pollingInterval]);

  // Conectar sesión de WhatsApp
  const connectWhatsAppSession = useCallback(async () => {
    if (!agent.sessionName) {
      toast({
        title: "Error",
        description: "No hay sesión configurada para este agente",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStep('generating');
    
    try {
      console.log('🔗 Conectando sesión WhatsApp:', agent.sessionName);
      
      // Resetear estado de expiración cuando se genera nuevo QR
      setQrExpired(false);
      
      // Llamar al workflow para conectar la sesión (esto debe generar QR)
      const response = await whatsappApi.connectWhatsAppSession(agent.sessionName, 'connect');
      
      if (response.success && response.base64) {
        console.log('✅ QR recibido para conexión');
        
        setWhatsappSession({
          sessionName: agent.sessionName,
          qrCode: response.base64,
          isConnected: false,
          timestamp: response.timestamp,
        });
        
        setConnectionStep('scanning');
        
        // Iniciar verificación de estado de conexión
        setConnectionChecking(true);
        
        // Función local para verificar periódicamente el estado de conexión
        const startPolling = (sessionName: string) => {
          console.log('🔄 Iniciando polling de conexión para:', sessionName);
          
          const interval = setInterval(async () => {
            try {
              console.log('🔍 Verificando estado de WhatsApp...');
              const status = await whatsappApi.checkWhatsAppStatus(sessionName, 'status');
              
              console.log('📊 Resultado de verificación:', status);
              
              if (status.success && (status.isConnected || status.connected)) {
                console.log('✅ WhatsApp conectado! Deteniendo polling.');
                
                // Actualizar estado de la sesión
                setWhatsappSession(prev => prev ? { ...prev, isConnected: true } : null);
                setConnectionChecking(false);
                setConnectionStep('connected');
                
                // Limpiar interval
                clearInterval(interval);
                setPollingInterval(null);
                
                // Actualizar estado del agente en la base de datos
                try {
                  await updateAgentStatus(agent.id, 'active');
                  onStatusChange(agent.id, 'active');
                  
                  toast({
                    title: '¡Conectado exitosamente!',
                    description: `WhatsApp conectado para ${agent.name}`,
                    variant: "default",
                  });

                  // Cerrar modal después de un pequeño delay para mostrar el éxito
                  setTimeout(() => {
                    onClose();
                  }, 2000);

                } catch (dbError) {
                  console.error('Error actualizando estado del agente:', dbError);
                  toast({
                    title: "Parcialmente exitoso",
                    description: "WhatsApp conectado, pero no se pudo actualizar el estado en la base de datos",
                    variant: "default",
                  });
                }

              } else {
                console.log('⏳ WhatsApp aún no conectado, continuando polling...');
              }
            } catch (error) {
              console.error('❌ Error verificando estado de WhatsApp:', error);
              // Continuar verificando, no detener por un error temporal
            }
          }, 3000); // Verificar cada 3 segundos

          // Guardar referencia del interval
          setPollingInterval(interval);

          // Auto-expirar QR después de 2 minutos
          setTimeout(() => {
            if (interval) {
              setQrExpired(true);
              clearInterval(interval);
              setPollingInterval(null);
              setConnectionChecking(false);
            }
          }, 120000);
        };

        startPolling(agent.sessionName);
        
      } else {
        throw new Error(response.error || 'No se pudo generar el código QR para conectar');
      }
      
    } catch (error) {
      console.error('❌ Error al conectar sesión WhatsApp:', error);
      setConnectionStep('error');
      toast({
        title: 'Error de conexión',
        description: error instanceof Error ? error.message : 'No se pudo conectar la sesión de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [agent.sessionName, agent.id, agent.name, toast, updateAgentStatus, onStatusChange, onClose]);

  // Auto-start connection process when modal opens
  useEffect(() => {
    if (isOpen && agent.sessionName && !whatsappSession) {
      connectWhatsAppSession();
    }
    // Removing connectWhatsAppSession from dependencies to prevent infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agent.sessionName, whatsappSession]);

  // Manejar cierre del modal
  const handleClose = async () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Si hay una sesión activa y no está conectada, desconectarla para limpiar recursos
    if (whatsappSession && whatsappSession.sessionName && connectionStep !== 'connected') {
      try {
        console.log('🧹 [WHATSAPP-CANCEL] Desconectando sesión de WhatsApp:', whatsappSession.sessionName);
        await whatsappApi.disconnectWhatsAppSession(whatsappSession.sessionName, 'disconnect');
        console.log('✅ [WHATSAPP-CANCEL] Sesión desconectada exitosamente');
      } catch (error) {
        console.warn('⚠️ [WHATSAPP-CANCEL] Error desconectando sesión (continuando):', error);
        // No mostrar error al usuario, es limpieza en background
      }
    }
    
    // Reset states
    setWhatsappSession(null);
    setConnectionChecking(false);
    setQrExpired(false);
    setConnectionStep('generating');
    
    onClose();
  };

  // Reintentar conexión
  const handleRetry = () => {
    setWhatsappSession(null);
    setQrExpired(false);
    setConnectionStep('generating');
    connectWhatsAppSession();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WhatsAppIcon size={24} />
            Conectar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del agente */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Conectando sesión para: <span className="font-medium">{agent.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Sesión: {agent.sessionName}
            </p>
          </div>

          {/* Estado de conexión */}
          {connectionStep === 'generating' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div>
                    <h3 className="font-medium">Generando código QR</h3>
                    <p className="text-sm text-muted-foreground">
                      Preparando la conexión de WhatsApp...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {connectionStep === 'scanning' && whatsappSession && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* QR Code */}
                  {!qrExpired ? (
                    <>
                      <div className="relative">
                        <img 
                          src={whatsappSession.qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-48 h-48 border rounded-lg"
                        />
                        {connectionChecking && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary">
                          <Smartphone className="h-4 w-4" />
                          <span className="font-medium">Escanea el código QR</span>
                        </div>
                        <ol className="text-sm text-muted-foreground text-left space-y-1">
                          <li>1. Abre WhatsApp en tu teléfono</li>
                          <li>2. Ve a Configuración → Dispositivos vinculados</li>
                          <li>3. Toca "Vincular un dispositivo"</li>
                          <li>4. Escanea este código QR</li>
                        </ol>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-medium text-destructive">Código QR expirado</h3>
                        <p className="text-sm text-muted-foreground">
                          El código QR ha expirado. Genera uno nuevo para continuar.
                        </p>
                      </div>
                      <Button onClick={handleRetry} className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generar nuevo QR
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {connectionStep === 'connected' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div>
                    <h3 className="font-medium text-green-700">¡Conectado exitosamente!</h3>
                    <p className="text-sm text-muted-foreground">
                      WhatsApp se ha conectado correctamente para {agent.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {connectionStep === 'error' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <X className="h-12 w-12 text-destructive" />
                  <div>
                    <h3 className="font-medium text-destructive">Error de conexión</h3>
                    <p className="text-sm text-muted-foreground">
                      No se pudo conectar WhatsApp. Intenta nuevamente.
                    </p>
                  </div>
                  <Button onClick={handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reintentar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
              disabled={isConnecting}
            >
              {connectionStep === 'connected' ? 'Cerrar' : 'Cancelar'}
            </Button>
            
            {connectionStep === 'scanning' && !qrExpired && (
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex-1"
                disabled={isConnecting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Nuevo QR
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}