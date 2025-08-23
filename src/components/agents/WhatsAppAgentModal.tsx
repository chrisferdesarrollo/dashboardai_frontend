import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WhatsAppIcon } from '@/components/ui/platform-icons';
import { ArrowLeft, Loader2, CheckCircle, QrCode, Smartphone } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent, CreateAgentInput } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { n8nApi } from '@/services/n8nApi';

interface WhatsAppAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  agent?: Agent | null;
}

type CreationStep = 'whatsapp-linking' | 'agent-config' | 'completed';

interface WhatsAppSession {
  sessionName: string;
  qrCode: string;
  isConnected: boolean;
  timestamp: string;
}

export function WhatsAppAgentModal({ isOpen, onClose, onBack, agent }: WhatsAppAgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<CreationStep>('whatsapp-linking');
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  const isEditing = !!agent;

  // Función para limpiar sesión cuando se cancela o cierra
  const cleanupSession = async (sessionName: string) => {
    try {
      console.log('Cleaning up WhatsApp session:', sessionName);
      await n8nApi.deleteWhatsAppSession(sessionName);
      console.log('Session cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up session:', error);
      // No mostrar error al usuario, es limpieza en background
    }
  };

  // Manejar cierre del modal
  const handleModalClose = () => {
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Limpiar sesión si no está conectada
    if (whatsappSession && !whatsappSession.isConnected) {
      cleanupSession(whatsappSession.sessionName);
    }
    
    setConnectionChecking(false);
    onClose();
  };

  // Manejar cancelación en el step de vinculación
  const handleCancelLinking = () => {
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Limpiar sesión
    if (whatsappSession) {
      cleanupSession(whatsappSession.sessionName);
    }
    
    setWhatsappSession(null);
    setConnectionChecking(false);
    onBack();
  };

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen && !isEditing) {
      setCurrentStep('whatsapp-linking');
      setWhatsappSession(null);
      setFormData({ name: '', description: '', prompt: '' });
    }
  }, [isOpen, isEditing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Crear sesión de WhatsApp
  const createWhatsAppSession = async () => {
    setIsConnecting(true);
    
    try {
      const sessionName = `agent_${Date.now()}`;
      
      // Resetear estado de expiración cuando se genera nuevo QR
      setQrExpired(false);
      
      // Llamar al webhook de n8n para crear la sesión
      const response = await n8nApi.createWhatsAppSession(sessionName);
      
      if (response.success && response.base64) {
        console.log('QR received:', {
          hasDataPrefix: response.base64.startsWith('data:'),
          first50chars: response.base64.substring(0, 50),
          length: response.base64.length
        });
        
        setWhatsappSession({
          sessionName: response.sessionName,
          qrCode: response.base64,
          isConnected: false,
          timestamp: response.timestamp,
        });
        
        // Iniciar verificación de estado de conexión
        setConnectionChecking(true);
        startConnectionPolling(response.sessionName);
        
      } else {
        throw new Error(response.error || 'No se pudo generar el código QR');
      }
      
    } catch (error) {
      console.error('Error al crear sesión WhatsApp:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la sesión de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Función para verificar periódicamente el estado de conexión
  const startConnectionPolling = (sessionName: string) => {
    console.log('Starting connection polling for session:', sessionName);
    
    const interval = setInterval(async () => {
      try {
        console.log('Polling WhatsApp status...');
        const status = await n8nApi.checkWhatsAppStatus(sessionName);
        
        console.log('Status check result:', status);
        
        if (status.success && (status.isConnected || status.connected)) {
          console.log('WhatsApp connected! Stopping polling.');
          setWhatsappSession(prev => prev ? { ...prev, isConnected: true } : null);
          setConnectionChecking(false);
          clearInterval(interval);
          setPollingInterval(null);
          
          toast({
            title: 'WhatsApp conectado',
            description: 'Tu cuenta de WhatsApp se ha vinculado exitosamente',
          });
          
          // Avanzar al siguiente paso después de un breve delay
          setTimeout(() => {
            setCurrentStep('agent-config');
          }, 1500);
        } else {
          console.log('WhatsApp not connected yet, continuing polling...');
        }
      } catch (error) {
        console.error('Error verificando estado de WhatsApp:', error);
        // Continuar verificando, no detener por un error temporal
      }
    }, 3000); // Verificar cada 3 segundos

    // Guardar referencia del interval
    setPollingInterval(interval);

    // Detener verificación después de 5 minutos
    setTimeout(() => {
      console.log('Stopping polling due to timeout (5 minutes)');
      clearInterval(interval);
      setPollingInterval(null);
      setConnectionChecking(false);
      setQrExpired(true);
      
      if (whatsappSession && !whatsappSession.isConnected) {
        toast({
          title: 'Código QR expirado',
          description: 'El código QR ha expirado. Genera uno nuevo para continuar.',
          variant: 'destructive',
        });
      }
    }, 300000); // 5 minutos
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsappSession) {
      toast({
        title: 'Error',
        description: 'No se ha vinculado WhatsApp',
        variant: 'destructive',
      });
      return;
    }

    try {
      const agentData: CreateAgentInput = {
        name: formData.name,
        description: formData.description,
        platform: 'whatsapp',
        workflowId: whatsappSession.sessionName,
        settings: {
          apiKeys: {},
          prompts: {
            system: formData.prompt,
          },
          variables: {
            sessionName: whatsappSession.sessionName,
            timestamp: whatsappSession.timestamp,
          },
        },
      };

      if (isEditing && agent) {
        await updateAgent({ ...agentData, id: agent.id });
        toast({
          title: 'Agente actualizado',
          description: 'El agente de WhatsApp se ha actualizado correctamente.',
        });
      } else {
        await createAgent(agentData);
        toast({
          title: 'Agente creado',
          description: 'El agente de WhatsApp se ha creado correctamente.',
        });
      }

      setCurrentStep('completed');
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el agente',
        variant: 'destructive',
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'whatsapp-linking':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Vincula tu WhatsApp</h3>
              <p className="text-muted-foreground">
                Primero necesitas conectar tu cuenta de WhatsApp para crear el agente
              </p>
            </div>

            {!whatsappSession ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Smartphone className="h-8 w-8 text-green-600" />
                </div>
                <Button 
                  onClick={createWhatsAppSession} 
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando código QR...
                    </>
                  ) : (
                    'Generar código QR'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!whatsappSession.isConnected ? (
                  <>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="mx-auto w-48 h-48 bg-white p-4 rounded-lg mb-4 border">
                          {whatsappSession.qrCode ? (
                            <img 
                              src={whatsappSession.qrCode.startsWith('data:') 
                                ? whatsappSession.qrCode 
                                : `data:image/png;base64,${whatsappSession.qrCode}`
                              }
                              alt="Código QR de WhatsApp"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <QrCode className="h-20 w-20 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center justify-center gap-2">
                            <QrCode className="h-4 w-4" />
                            Escanea el código QR
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Abre WhatsApp en tu teléfono y escanea este código QR
                          </p>
                          {connectionChecking && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-3">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Esperando conexión...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-green-600 mb-2">¡WhatsApp conectado!</h4>
                      <p className="text-sm text-muted-foreground">
                        Tu cuenta se ha vinculado exitosamente
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* Botones de acción */}
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelLinking}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  {!whatsappSession.isConnected && qrExpired && (
                    <Button
                      type="button"
                      onClick={createWhatsAppSession}
                      disabled={isConnecting}
                      className="flex-1"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        'Generar nuevo QR'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'agent-config':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Configura tu agente</h3>
              <p className="text-muted-foreground">
                Define el nombre y comportamiento de tu agente de WhatsApp
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Agente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Asistente de Ventas"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe qué hace este agente..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="prompt">Prompt del Sistema</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => handleChange('prompt', e.target.value)}
                  placeholder="Define cómo debe comportarse tu agente. Ej: Eres un asistente de ventas amigable que ayuda a los clientes..."
                  rows={4}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('whatsapp-linking')}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Agente'
                )}
              </Button>
            </div>
          </form>
        );

      case 'completed':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">¡Agente creado exitosamente!</h3>
              <p className="text-muted-foreground">
                Tu agente de WhatsApp está listo para usar
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleModalClose();
      }
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <WhatsAppIcon size={20} />
            <DialogTitle>
              {isEditing ? 'Editar Agente de WhatsApp' : 'Crear Agente de WhatsApp'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
