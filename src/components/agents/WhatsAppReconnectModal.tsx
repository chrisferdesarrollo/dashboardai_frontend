import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { n8nApi } from '@/services/n8nApi';
import { Agent, WhatsAppPlatformConfig } from '@/types/agent';

interface WhatsAppReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onReconnectSuccess: () => void;
}

interface WhatsAppSession {
  sessionName: string;
  qrCode: string;
  isConnected: boolean;
  timestamp: string;
}

export function WhatsAppReconnectModal({ 
  isOpen, 
  onClose, 
  agent, 
  onReconnectSuccess 
}: WhatsAppReconnectModalProps) {
  const { toast } = useToast();
  
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Estado para mostrar progreso de conexión
  const [connectionProgress, setConnectionProgress] = useState<{
    step: 'generating' | 'waiting' | 'verifying' | 'connected' | 'failed';
    message: string;
  }>({ step: 'waiting', message: 'Listo para generar QR' });

  // Función para obtener el sessionName del agente
  const getSessionName = (agent: Agent): string => {
    if (!agent) return '';
    
    console.log('🔍 [RECONNECT] === INICIANDO BÚSQUEDA DE SESSIONNAME ===');
    console.log('🔍 [RECONNECT] Agent ID:', agent.id);
    console.log('🔍 [RECONNECT] Agent name:', agent.name);
    console.log('🔍 [RECONNECT] Agent platform:', agent.platform);
    console.log('🔍 [RECONNECT] Agent object keys:', Object.keys(agent));
    
    console.log('🔍 [RECONNECT] Analizando agente para obtener sessionName:', {
      id: agent.id,
      name: agent.name,
      platform: agent.platform,
      workflowId: agent.workflowId, // Debería ser "agent_175665623854"
      platformConfig: agent.platformConfig, // Ver contenido completo
      rawAgent: JSON.stringify(agent, null, 2), // ✅ LOGGING COMPLETO DEL AGENTE
    });
    
    try {
      // 🎯 PRIORIDAD 1: Buscar en platformConfig primero (más confiable para sessionName)
      console.log('🔍 [RECONNECT] PASO 1: Revisando platformConfig...');
      if (agent.platformConfig) {
        console.log('🔍 [RECONNECT] platformConfig existe:', typeof agent.platformConfig, agent.platformConfig);
        try {
          const config: WhatsAppPlatformConfig = typeof agent.platformConfig === 'string' 
            ? JSON.parse(agent.platformConfig) 
            : agent.platformConfig;
          console.log('🔍 [RECONNECT] platformConfig parseado:', config);
          if (config.sessionName && config.sessionName.trim() !== '') {
            console.log('✅ [RECONNECT] SessionName encontrado en agent.platformConfig:', config.sessionName);
            return config.sessionName;
          } else {
            console.log('⚠️ [RECONNECT] platformConfig no tiene sessionName válido:', config.sessionName);
          }
        } catch (error) {
          console.warn('❌ [RECONNECT] Error parsing agent.platformConfig:', error);
        }
      } else {
        console.log('⚠️ [RECONNECT] agent.platformConfig no existe');
      }
      
      // PRIORIDAD 2: workflowId - pero solo si parece ser un sessionName, no un workflow ID
      console.log('🔍 [RECONNECT] PASO 2: Revisando workflowId...');
      if (agent.workflowId && agent.workflowId.trim() !== '') {
        console.log('🔍 [RECONNECT] workflowId existe:', agent.workflowId);
        // Verificar si workflowId es un sessionName (formato: agent_123456789) o workflow ID (formato: UUID)
        const isSessionName = agent.workflowId.startsWith('agent_') && /^agent_\d+$/.test(agent.workflowId);
        const isWorkflowId = agent.workflowId.includes('-') && agent.workflowId.length > 30; // UUID pattern
        
        console.log('🔍 [RECONNECT] Análisis de workflowId:', {
          workflowId: agent.workflowId,
          isSessionName,
          isWorkflowId,
          startsWithAgent: agent.workflowId.startsWith('agent_'),
          matchesPattern: /^agent_\d+$/.test(agent.workflowId),
          hasHyphens: agent.workflowId.includes('-'),
          length: agent.workflowId.length
        });
        
        if (isSessionName) {
          console.log('✅ [RECONNECT] SessionName encontrado en workflowId (formato sessionName):', agent.workflowId);
          return agent.workflowId;
        } else if (isWorkflowId) {
          console.log('⚠️ [RECONNECT] workflowId contiene ID de workflow, no sessionName:', agent.workflowId);
          // Continuar buscando en otros lugares
        } else {
          console.log('✅ [RECONNECT] SessionName encontrado en workflowId (formato custom):', agent.workflowId);
          return agent.workflowId;
        }
      } else {
        console.log('⚠️ [RECONNECT] agent.workflowId no existe o está vacío');
      }
      
      // PRIORIDAD 3: Buscar en settings.variables donde se almacena la configuración de plataforma
      if (agent.settings?.variables) {
        console.log('🔍 [RECONNECT] Revisando settings.variables:', agent.settings.variables);
        
        const sessionName = agent.settings.variables.sessionName;
        if (sessionName && sessionName !== '') {
          console.log('✅ [RECONNECT] SessionName encontrado en variables:', sessionName);
          return sessionName;
        }
        
        // También buscar otros posibles nombres de campo
        const sessionId = agent.settings.variables.sessionId;
        if (sessionId && sessionId !== '') {
          console.log('✅ [RECONNECT] SessionName encontrado como sessionId:', sessionId);
          return sessionId;
        }
        
        const whatsappSession = agent.settings.variables.whatsappSession;
        if (whatsappSession && whatsappSession !== '') {
          console.log('✅ [RECONNECT] SessionName encontrado como whatsappSession:', whatsappSession);
          return whatsappSession;
        }
        
        // Buscar en platformConfig si existe (puede estar como JSON string)
        const platformConfig = agent.settings.variables.platformConfig;
        if (platformConfig) {
          try {
            const config = typeof platformConfig === 'string' ? JSON.parse(platformConfig) : platformConfig;
            if (config.sessionName) {
              console.log('✅ [RECONNECT] SessionName encontrado en variables.platformConfig:', config.sessionName);
              return config.sessionName;
            }
          } catch (error) {
            console.warn('Error parsing platformConfig from variables:', error);
          }
        }
      }
      
      // PRIORIDAD 4: Buscar en settings.apiKeys donde también podría estar almacenado
      if (agent.settings?.apiKeys) {
        console.log('🔍 [RECONNECT] Revisando settings.apiKeys:', agent.settings.apiKeys);
        
        const sessionName = agent.settings.apiKeys.sessionName;
        if (sessionName && sessionName !== '') {
          console.log('✅ [RECONNECT] SessionName encontrado en apiKeys:', sessionName);
          return sessionName;
        }
      }
      
    } catch (error) {
      console.warn('❌ Error parsing agent settings:', error);
    }
    
    // Fallback: usar el nombre del agente como sessionName
    const fallbackSessionName = agent.name?.replace(/\s+/g, '_').toLowerCase() || `agent_${agent.id}`;
    console.log('⚠️ [RECONNECT] No se encontró sessionName, usando fallback:', fallbackSessionName);
    return fallbackSessionName;
  };

  // Función para generar nuevo QR para reconexión
  const handleGenerateQR = async () => {
    if (!agent) return;
    
    setIsConnecting(true);
    setQrExpired(false);
    
    try {
      const sessionName = getSessionName(agent);
      console.log('🔄 [RECONNECT] Conectando sesión existente:', sessionName);
      
      // Usar la función específica para reconexión que genera QR de sesión existente
      const response = await n8nApi.reconnectExistingWhatsAppSession(sessionName);
      
      console.log('📥 [RECONNECT] Respuesta recibida:', {
        success: response.success,
        base64Length: response.base64?.length,
        base64Prefix: response.base64?.substring(0, 50),
        base64HasDataPrefix: response.base64?.startsWith('data:'),
        sessionName: response.sessionName
      });
      
      if (response.success && response.base64) {
        // Limpiar el base64 si ya viene con el prefijo
        let cleanBase64 = response.base64;
        if (cleanBase64.startsWith('data:image/')) {
          // Si ya tiene el prefijo data:, usarlo directamente
          console.log('🖼️ [RECONNECT] QR ya tiene prefijo data:, usando directamente');
        } else {
          // Si no tiene prefijo, agregarlo
          cleanBase64 = `data:image/png;base64,${cleanBase64}`;
          console.log('🖼️ [RECONNECT] Agregando prefijo data: al QR');
        }
        
        setWhatsappSession({
          sessionName: response.sessionName,
          qrCode: cleanBase64, // Usar la versión limpia
          isConnected: false,
          timestamp: response.timestamp
        });
        // Iniciar verificación de estado de conexión
        setConnectionChecking(true);
        
        // DESPUÉS de generar el QR, activar el workflow de verificación en n8n
        console.log('🚀 [RECONNECT] Activando workflow de verificación en n8n...');
        setTimeout(async () => {
          try {
            // Hacer una primera llamada para "despertar" el workflow de verificación
            await n8nApi.checkWhatsAppStatus(sessionName);
            console.log('✅ [RECONNECT] Workflow de verificación activado en n8n');
          } catch (error) {
            console.warn('⚠️ [RECONNECT] Error activando workflow de verificación:', error);
          }
        }, 1000); // Activar después de 1 segundo de generar el QR
        
        toast({
          title: 'QR Generado',
          description: 'Escanea el código QR con tu WhatsApp para reconectar la sesión existente.',
        });
      } else {
        setConnectionProgress({ step: 'failed', message: 'Error generando el código QR' });
        throw new Error('No se pudo generar el código QR para la reconexión');
      }
    } catch (error) {
      console.error('Error reconectando sesión:', error);
      setConnectionProgress({ step: 'failed', message: 'Error reconectando sesión' });
      toast({
        title: 'Error',
        description: 'No se pudo reconectar la sesión de WhatsApp. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Callbacks estables
  const handleSuccess = useCallback(() => {
    onReconnectSuccess();
    onClose();
  }, [onReconnectSuccess, onClose]);

  // Polling automático cuando se muestra el QR - Simplificado para evitar dependencias circulares
  useEffect(() => {
    if (!whatsappSession || whatsappSession.isConnected || qrExpired || pollingInterval) {
      return;
    }
    
    console.log('🔄 [RECONNECT] Iniciando polling de conexión para sesión:', whatsappSession.sessionName);
    
    // Función de polling con timing inteligente
    let pollCount = 0;
    const pollConnection = async () => {
      try {
        pollCount++;
        console.log(`🔍 [RECONNECT] Verificando estado de WhatsApp (intento ${pollCount})...`);
        const status = await n8nApi.checkWhatsAppStatus(whatsappSession.sessionName);
        
        console.log('📋 [RECONNECT] Respuesta del status:', status);
        
        // Solo considerar como conectado si el estado es realmente 'open' o 'connected'
        const isConnected = status.success && (
          (status.isConnected || status.connected) && 
          (status.status === 'open' || status.status === 'connected')
        );
        
        if (isConnected) {
          console.log('✅ [RECONNECT] ¡WhatsApp conectado exitosamente!');
          
          // Actualizar estado local
          setWhatsappSession(prev => prev ? { ...prev, isConnected: true } : null);
          setConnectionChecking(false);
          
          // Limpiar polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          // Toast de éxito
          toast({
            title: '✅ WhatsApp Reconectado',
            description: `¡Tu cuenta de WhatsApp ha sido reconectada exitosamente al agente "${agent?.name}"!`,
            duration: 5000,
          });
          
          // Llamar callback de éxito después de un breve delay
          setTimeout(() => {
            handleSuccess();
          }, 2000);
          
        } else {
          console.log(`🔍 [RECONNECT] WhatsApp aún no conectado (${status.status}). Continuando polling...`);
          // Solo continuar polling sin actualizar mensajes complejos
        }
        
      } catch (error) {
        console.error('❌ [RECONNECT] Error verificando estado de WhatsApp:', error);
        // Continuar polling sin detener por errores temporales
      }
    };
    
    // Empezar polling después de 5 segundos para dar tiempo al usuario
    console.log('⏰ [RECONNECT] Esperando 5 segundos antes de iniciar verificación...');
    
    const initialDelay = setTimeout(() => {
      // Iniciar polling cada 5 segundos (más espaciado)
      setConnectionChecking(true);
      const pollingIntervalId = setInterval(pollConnection, 5000);
      setPollingInterval(pollingIntervalId);
    }, 1000); // Esperar 5 segundos
    
    // Timeout de 5 minutos para expirar el QR
    const qrTimeout = setTimeout(() => {
      console.log('⏰ [RECONNECT] QR expirado por timeout');
      setQrExpired(true);
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setConnectionChecking(false);
      
      toast({
        title: '⏰ Código QR Expirado',
        description: 'El código QR ha expirado. Genera uno nuevo para continuar.',
        variant: 'destructive',
      });
    }, 300000); // 5 minutos
    
    return () => {
      clearTimeout(initialDelay);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      clearTimeout(qrTimeout);
      setConnectionChecking(false);
    };
  }, [whatsappSession, qrExpired, pollingInterval, agent?.name, handleSuccess, toast]);

  // Cleanup al cerrar modal
  useEffect(() => {
    if (!isOpen) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setWhatsappSession(null);
      setQrExpired(false);
      setConnectionChecking(false);
    }
  }, [isOpen, pollingInterval]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reconectar WhatsApp
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información del agente */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{agent.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Sesión: {getSessionName(agent)}
                </p>
              </div>
              <Badge variant="outline">WhatsApp</Badge>
            </div>
          </div>

          {/* Estados del proceso */}
          {!whatsappSession && !isConnecting && (
            <div className="text-center space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Reconectar Sesión Existente</h4>
                <p className="text-sm text-blue-700">
                  Genera un código QR para reconectar tu sesión de WhatsApp existente a este agente.
                  No se creará una nueva sesión, se reconectará la existente.
                </p>
              </div>
              
              <Button 
                onClick={handleGenerateQR}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar Código QR
              </Button>
            </div>
          )}

          {/* Generando QR */}
          {isConnecting && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium">Generando código QR...</p>
            </div>
          )}

          {/* QR Code mostrado */}
          {whatsappSession && !whatsappSession.isConnected && !qrExpired && (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="font-medium mb-2">Escanea el código QR</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Abre WhatsApp → Menú → Dispositivos vinculados → Vincular dispositivo
                </p>
                
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <img 
                      src={whatsappSession.qrCode}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48"
                      onError={(e) => {
                        console.error('❌ Error cargando imagen QR:', e);
                        console.log('🔍 QR Code data:', {
                          length: whatsappSession.qrCode.length,
                          prefix: whatsappSession.qrCode.substring(0, 50),
                          isDataUrl: whatsappSession.qrCode.startsWith('data:')
                        });
                      }}
                      onLoad={() => {
                        console.log('✅ QR Code cargado exitosamente');
                      }}
                    />
                  </div>
                </div>
                
                {/* Estado simple de espera */}
                <div className="border rounded-lg p-3 mb-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-blue-600">Esperando escaneo del QR...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conexión Exitosa */}
          {whatsappSession && whatsappSession.isConnected && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h4 className="font-medium text-green-900 mb-2">¡WhatsApp Conectado!</h4>
                <p className="text-sm text-green-700 mb-4">
                  Tu cuenta de WhatsApp ha sido reconectada exitosamente al agente "{agent?.name}".
                </p>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-muted-foreground">
                    Sesión: {whatsappSession.sessionName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Estado: Conectado y listo para usar
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QR Expirado */}
          {qrExpired && (
            <div className="text-center space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <XCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h4 className="font-medium text-yellow-900 mb-1">Código QR Expirado</h4>
                <p className="text-sm text-yellow-700">
                  El código QR ha expirado. Genera uno nuevo para continuar.
                </p>
              </div>
              
              <Button 
                onClick={handleGenerateQR}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generar Nuevo QR
              </Button>
            </div>
          )}

          {/* Conectado exitosamente */}
          {whatsappSession?.isConnected && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium text-green-900 mb-1">¡Reconectado Exitosamente!</h4>
                <p className="text-sm text-green-700">
                  Tu WhatsApp ha sido reconectado al agente "{agent.name}".
                </p>
              </div>
            </div>
          )}

          {/* Botones del footer */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isConnecting && !whatsappSession?.isConnected}
            >
              {whatsappSession?.isConnected ? 'Cerrar' : 
               connectionProgress.step === 'verifying' ? 'Cancelar' : 
               'Cancelar'}
            </Button>
            
            {whatsappSession && whatsappSession.isConnected && (
              <Button 
                onClick={onClose}
                className="flex-1"
                variant="default"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Finalizar
              </Button>
            )}
            
            {whatsappSession && !whatsappSession.isConnected && !qrExpired && (
              <Button 
                onClick={handleGenerateQR}
                variant="ghost"
                size="sm"
                disabled={isConnecting}
                title="Regenerar código QR"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
