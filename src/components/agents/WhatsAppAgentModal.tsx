import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WhatsAppIcon } from '@/components/ui/platform-icons';
import { ArrowLeft, Loader2, CheckCircle, QrCode, Smartphone, AlertTriangle } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { whatsappApi } from '@/services/whatsappApi';
import { CreateAgentRequest } from '@/services/agentApi';

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

interface WorkflowSelection {
  id: string;
  name: string;
  description?: string;
  isPrimary: boolean;
  executionOrder: number;
}

export function WhatsAppAgentModal({ isOpen, onClose, onBack, agent }: WhatsAppAgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<CreationStep>('whatsapp-linking');
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para el dialog de confirmación de eliminación
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<'close' | 'cancel' | null>(null);
  
  const [initialModalOpen, setInitialModalOpen] = useState(true);
  
  // Referencia para evitar resets durante navegación interna
  const hasInitialized = useRef(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    features: {
      attend24_7: true,
      autoFAQ: true,
      guideCustomers: true,
      qualifyLeads: true,
      humanEscalation: true,
      salesIntegration: true
    },
    customConfig: {
      responseDelay: 1000,
      maxResponseLength: 1000,
      useTypingIndicator: true,
      autoReply: true,
      apiKeys: {
        openai: '',
        anthropic: '',
        custom: ''
      },
      dataSources: {
        knowledgeBase: '',
        database: '',
        webhook: ''
      },
      personality: {
        tone: 'friendly',
        formality: 'casual',
        language: 'es'
      },
      businessHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
        timezone: 'America/Mexico_City',
        outsideHoursMessage: ''
      },
      fallbackBehavior: {
        enabled: true,
        message: 'Lo siento, no pude entender tu mensaje. ¿Podrías reformularlo?',
        transferToHuman: false,
        retryAttempts: 1
      },
      escalationRules: {
        keywords: ['hablar con humano', 'quiero comprar', 'problema urgente'],
        conditions: ['price_inquiry', 'complex_issue', 'customer_request'],
        autoTransferAfter: 3,
        workingHours: true
      },
      leadCapture: {
        enabled: true,
        requiredFields: ['name', 'phone', 'email'],
        qualification: {
          budget: true,
          timeline: true,
          decision_maker: true
        }
      }
    }
  });

  const isEditing = !!agent;

  // Función para generar prompt simple basado en la configuración del usuario
  const generateBusinessPrompt = (data: typeof formData) => {
    const basePrompt = data.prompt.trim();

    // Si no hay prompt personalizado, usar uno básico
    if (!basePrompt) {
      return `Eres un asistente de IA para WhatsApp. Tu objetivo es ayudar a los clientes de manera profesional y amigable.

PERSONALIDAD:
- Tono: ${data.customConfig.personality.tone}
- Formalidad: ${data.customConfig.personality.formality}
- Idioma: ${data.customConfig.personality.language}

Siempre mantén un tono profesional pero ${data.customConfig.personality.tone}, sé ${data.customConfig.personality.formality} y responde en ${data.customConfig.personality.language}.`;
    }

    // Si hay prompt personalizado, solo agregar configuración de personalidad
    const enhancedPrompt = `
${basePrompt}

PERSONALIDAD:
- Tono: ${data.customConfig.personality.tone}
- Formalidad: ${data.customConfig.personality.formality}
- Idioma: ${data.customConfig.personality.language}

Siempre mantén un tono profesional pero ${data.customConfig.personality.tone}, sé ${data.customConfig.personality.formality} y responde en ${data.customConfig.personality.language}.
`;

    return enhancedPrompt.trim();
  };

  // Función para limpiar sesión cuando se cancela o cierra
  const cleanupSession = async (sessionName: string) => {
    try {
      console.log('🚨 [CLEANUP] Limpiando sesión de WhatsApp:', sessionName);
      await whatsappApi.deleteWhatsAppSession(sessionName, 'delete');
      console.log('✅ [CLEANUP] Sesión limpiada exitosamente');
      
      // Mostrar toast informativo (no intrusivo)
      toast({
        title: 'Sesión eliminada',
        description: 'La instancia de WhatsApp se eliminó correctamente.',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ [CLEANUP] Error limpiando sesión:', error);
      // No mostrar error al usuario, es limpieza en background
      // Solo log para debugging
    }
  };

  // Verificar si necesita limpieza basado en el paso actual
  const shouldCleanupSession = () => {
    // Solo limpiar si hay una sesión de WhatsApp Y estamos antes del paso 'completed'
    // (independientemente de si está conectada o no)
    return whatsappSession && currentStep !== 'completed';
  };

  // Verificar si necesita confirmación antes de limpiar
  const needsConfirmation = () => {
    // Pedir confirmación solo si WhatsApp está conectado
    return whatsappSession && whatsappSession.isConnected;
  };

  // Mostrar dialog de confirmación
  const showConfirmationDialog = (action: 'close' | 'cancel') => {
    setPendingAction(action);
    setShowDeleteConfirmation(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (whatsappSession) {
      console.log('🗑️ [CONFIRM] Usuario confirmó eliminación de sesión conectada');
      await cleanupSession(whatsappSession.sessionName);
      setWhatsappSession(null);
    }
    
    setShowDeleteConfirmation(false);
    setConnectionChecking(false);
    
    console.log('🗑️ [CONFIRM] Sesión eliminada tras confirmación');
    
    // Ejecutar la acción pendiente
    if (pendingAction === 'close') {
      onClose();
    } else if (pendingAction === 'cancel') {
      onClose();
    }
    
    setPendingAction(null);
  };

  // Cancelar eliminación
  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setPendingAction(null);
    // No hacer nada más, mantener el modal abierto
  };

  // Manejar cierre del modal con limpieza inteligente
  const handleModalClose = () => {
    console.log('❌ [CLOSE] Modal cerrado en paso:', currentStep);
    
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Si necesita confirmación para limpiar sesión conectada
    if (needsConfirmation()) {
      showConfirmationDialog('close');
      return;
    }
    
    // Limpiar sesión automáticamente (sin confirmación)
    if (shouldCleanupSession()) {
      console.log('🧹 [CLOSE] Limpiando sesión automáticamente:', whatsappSession.sessionName);
      cleanupSession(whatsappSession.sessionName);
    }
    
    setConnectionChecking(false);
    
    console.log('🧹 [CLOSE] Cerrando modal completamente');
    
    onClose();
  };

  // Manejar cancelación en el step de vinculación
  const handleCancelLinking = () => {
    console.log('🚫 [CANCEL-LINKING] Cancelación en vinculación');
    
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Si necesita confirmación para limpiar sesión conectada
    if (needsConfirmation()) {
      showConfirmationDialog('cancel');
      return;
    }
    
    // Limpiar sesión automáticamente (sin confirmación para sesiones no conectadas)
    if (shouldCleanupSession()) {
      console.log('🧹 [CANCEL-LINKING] Limpiando sesión automáticamente');
      cleanupSession(whatsappSession.sessionName);
    }
    
    setWhatsappSession(null);
    setConnectionChecking(false);
    onBack();
  };

  // Manejar botón atrás con navegación inteligente
  const handleBackButton = () => {
    console.log('🔙 [BACK] Botón atrás presionado en paso:', currentStep);
    
    // Limpiar polling si está activo
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Navegación específica por paso
    switch (currentStep) {
      case 'agent-config':
        console.log('🔙 [BACK] Regresando de agent-config a whatsapp-linking');
        setCurrentStep('whatsapp-linking');
        break;
        
      case 'whatsapp-linking':
      default:
        // Si estamos en linking y hay una sesión, limpiarla
        if (shouldCleanupSession()) {
          console.log('🧹 [BACK] Limpiando sesión desde whatsapp-linking');
          cleanupSession(whatsappSession.sessionName);
          setWhatsappSession(null);
          setConnectionChecking(false);
        }
        onBack(); // Salir completamente del modal
        break;
    }
  };

  // Reset modal state when opening  
  useEffect(() => {
    if (isOpen && !isEditing && !hasInitialized.current) {
      console.log('🔄 [MODAL-INIT] Inicializando modal por primera vez');
      
      // Resetear al paso inicial y datos
      setCurrentStep('whatsapp-linking');
      setWhatsappSession(null);
      setFormData({ 
        name: '', 
        description: '', 
        prompt: '',
        features: {
          attend24_7: true,
          autoFAQ: true,
          guideCustomers: true,
          qualifyLeads: true,
          humanEscalation: true,
          salesIntegration: true
        },
        customConfig: {
          responseDelay: 1000,
          maxResponseLength: 1000,
          useTypingIndicator: true,
          autoReply: true,
          apiKeys: {
            openai: '',
            anthropic: '',
            custom: ''
          },
          dataSources: {
            knowledgeBase: '',
            database: '',
            webhook: ''
          },
          personality: {
            tone: 'friendly',
            formality: 'casual',
            language: 'es'
          },
          businessHours: {
            enabled: false,
            start: '09:00',
            end: '18:00',
            timezone: 'America/Mexico_City',
            outsideHoursMessage: ''
          },
          fallbackBehavior: {
            enabled: true,
            message: 'Lo siento, no pude entender tu mensaje. ¿Podrías reformularlo?',
            transferToHuman: false,
            retryAttempts: 1
          },
          escalationRules: {
            keywords: ['hablar con humano', 'quiero comprar', 'problema urgente'],
            conditions: ['price_inquiry', 'complex_issue', 'customer_request'],
            autoTransferAfter: 3,
            workingHours: true
          },
          leadCapture: {
            enabled: true,
            requiredFields: ['name', 'phone', 'email'],
            qualification: {
              budget: true,
              timeline: true,
              decision_maker: true
            }
          }
        }
      });
      
      // Marcar como inicializado para evitar resets posteriores
      hasInitialized.current = true;
      setInitialModalOpen(false);
    }
  }, [isOpen, isEditing]);

  // Reset flags when modal closes completely
  useEffect(() => {
    if (!isOpen) {
      console.log('🚪 [MODAL-CLOSE] Modal cerrado, reseteando flags');
      setInitialModalOpen(true);
      hasInitialized.current = false; // Permitir reinicialización en próxima apertura
    }
  }, [isOpen]);

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
      const response = await whatsappApi.createWhatsAppSession(sessionName, 'create');
      
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
        const status = await whatsappApi.checkWhatsAppStatus(sessionName, 'status');
        
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
          
          // Ya no navegar automáticamente - dejar que el usuario decida cuándo continuar
          console.log('✅ [CONNECTION] WhatsApp conectado, usuario puede continuar manualmente');
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

    if (!formData.name.trim() || !formData.prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Creating WhatsApp agent');
      
      // Generar prompt inteligente basado en la configuración de negocio
      const enhancedPrompt = generateBusinessPrompt(formData);
      
      // Preparar datos para enviar a la API
      const agentData: CreateAgentRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        platform: 'whatsapp',
        prompt: enhancedPrompt,
        sessionName: whatsappSession.sessionName, // ✅ IMPORTANTE: Enviar sessionName en el campo correcto para BD
        workflowId: whatsappSession.sessionName, // 🎯 MANTENER: Guardar sessionName también en workflowId para compatibilidad
        platformConfig: JSON.stringify({
          sessionName: whatsappSession.sessionName,
          isConnected: true,
          connectedAt: new Date().toISOString(),
          timestamp: whatsappSession.timestamp
        }),
        customConfig: formData.customConfig,
        userId: user?.id
      };

      // Usar el store para crear el agente (esto actualiza automáticamente la lista)
      await createAgent(agentData);
      
      console.log('Agent created successfully via store');
      
      // Mostrar mensaje de éxito
      toast({
        title: 'Agente creado',
        description: `¡Agente "${formData.name}" creado exitosamente!`,
      });
      
      console.log('🎉 [SUCCESS] Agente creado exitosamente');
      
      // Limpiar el formulario
      setFormData({
        name: '',
        description: '',
        prompt: '',
        features: {
          attend24_7: true,
          autoFAQ: true,
          guideCustomers: true,
          qualifyLeads: true,
          humanEscalation: true,
          salesIntegration: true
        },
        customConfig: {
          responseDelay: 1000,
          maxResponseLength: 1000,
          useTypingIndicator: true,
          autoReply: true,
          apiKeys: {
            openai: '',
            anthropic: '',
            custom: ''
          },
          dataSources: {
            knowledgeBase: '',
            database: '',
            webhook: ''
          },
          personality: {
            tone: 'friendly',
            formality: 'casual',
            language: 'es'
          },
          businessHours: {
            enabled: false,
            start: '09:00',
            end: '18:00',
            timezone: 'America/Mexico_City',
            outsideHoursMessage: ''
          },
          fallbackBehavior: {
            enabled: true,
            message: 'Lo siento, no pude entender tu mensaje. ¿Podrías reformularlo?',
            transferToHuman: false,
            retryAttempts: 1
          },
          escalationRules: {
            keywords: ['hablar con humano', 'quiero comprar', 'problema urgente'],
            conditions: ['price_inquiry', 'complex_issue', 'customer_request'],
            autoTransferAfter: 3,
            workingHours: true
          },
          leadCapture: {
            enabled: true,
            requiredFields: ['name', 'phone', 'email'],
            qualification: {
              budget: true,
              timeline: true,
              decision_maker: true
            }
          }
        }
      });
      
      // Avanzar al paso de completado
      setCurrentStep('completed');
      
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: unknown) {
      console.error('Error creating agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el agente. Inténtalo de nuevo.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
                  
                  {/* Botón normal para continuar cuando está conectado */}
                  {whatsappSession.isConnected && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep('agent-config')}
                      className="flex-1"
                    >
                      Continuar
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
                  className="placeholder:text-muted-foreground/40"
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
                  className="placeholder:text-muted-foreground/40"
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
                  className="placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackButton}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('🚫 [CANCEL] Botón cancelar presionado desde agent-config');
                  // Si necesita confirmación para limpiar sesión conectada
                  if (needsConfirmation()) {
                    showConfirmationDialog('cancel');
                    return;
                  }
                  
                  // Limpiar sesión automáticamente (sin confirmación)
                  if (shouldCleanupSession()) {
                    console.log('🧹 [CANCEL] Limpiando sesión automáticamente desde agent-config');
                    cleanupSession(whatsappSession.sessionName);
                  }
                  
                  onClose();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
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
              onClick={handleBackButton}
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
      
      {/* Dialog de Confirmación de Eliminación */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-full">
                <WhatsAppIcon size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  ¿Estás seguro de que quieres {pendingAction === 'close' ? 'cerrar' : 'cancelar'}?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Se eliminará la vinculación de WhatsApp que acabas de crear ya que no has guardado el agente.
                </p>
              </div>
            </div>
            
            {whatsappSession && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Sesión a eliminar:</span>
                  <span className="font-mono text-gray-900 dark:text-gray-100">
                    {whatsappSession.sessionName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Estado:</span>
                  <span className={`font-semibold ${whatsappSession.isConnected 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                  }`}>
                    {whatsappSession.isConnected ? 'Conectado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              className="flex-1"
            >
              Mantener Sesión
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1"
            >
              Eliminar y {pendingAction === 'close' ? 'Cerrar' : 'Cancelar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
