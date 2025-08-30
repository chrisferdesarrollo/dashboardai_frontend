import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WhatsAppIcon } from '@/components/ui/platform-icons';
import { ArrowLeft, Loader2, CheckCircle, QrCode, Smartphone, Plus, Search, Star } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { n8nApi } from '@/services/n8nApi';
import { CreateAgentRequest } from '@/services/agentApi';
import { workflowService, WorkflowResponse } from '@/services/workflowService';
import { Workflow } from '@/types/workflow';

// Tipos para la selección de workflows
interface WorkflowSelection {
  id: string;
  name: string;
  description?: string;
  isPrimary: boolean;
  executionOrder: number;
}

interface WhatsAppAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  agent?: Agent | null;
}

type CreationStep = 'whatsapp-linking' | 'workflow-selection' | 'business-config' | 'agent-config' | 'completed';

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
  
  // Estados para selección de workflows
  const [availableWorkflows, setAvailableWorkflows] = useState<WorkflowResponse[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<WorkflowSelection[]>([]);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [workflowSearchTerm, setWorkflowSearchTerm] = useState('');
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
    businessType: '',
    businessInfo: '',
    targetAudience: '',
    conversationalGoal: 'sales', // sales, reservations, support, lead_generation
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

  // Función para generar prompt inteligente basado en el negocio
  const generateBusinessPrompt = (data: typeof formData) => {
    const basePrompt = data.prompt.trim();
    
    const businessTypePrompts = {
      restaurant: "especializado en atención gastronómica",
      retail: "experto en ventas al por menor",
      services: "especializado en servicios profesionales",
      healthcare: "especializado en atención médica y salud",
      education: "especializado en servicios educativos",
      real_estate: "experto en bienes raíces",
      automotive: "especializado en servicios automotrices",
      beauty: "especializado en servicios de belleza y spa",
      travel: "experto en viajes y turismo",
      technology: "especializado en tecnología",
      other: "especializado en tu industria"
    };

    const goalPrompts = {
      sales: "Tu objetivo principal es vender productos o servicios, identificar necesidades del cliente y cerrar ventas.",
      reservations: "Tu objetivo principal es ayudar a los clientes a hacer reservas, verificar disponibilidad y confirmar citas.",
      support: "Tu objetivo principal es brindar soporte técnico y resolver problemas de los clientes.",
      lead_generation: "Tu objetivo principal es capturar información de prospectos y calificar leads de calidad."
    };

    const enhancedPrompt = `
${basePrompt}

INFORMACIÓN DE NEGOCIO:
${data.businessInfo}

AUDIENCIA OBJETIVO: ${data.targetAudience}

CONTEXTO PROFESIONAL:
Eres un asistente de IA ${businessTypePrompts[data.businessType as keyof typeof businessTypePrompts] || 'profesional'}.
${goalPrompts[data.conversationalGoal as keyof typeof goalPrompts]}

FUNCIONALIDADES ACTIVAS:
✅ Atiendes consultas 24/7
✅ Respondes preguntas frecuentes automáticamente
✅ Guías a los clientes en su proceso de compra/reserva
✅ Calificas y filtras prospectos reales
✅ Te integras con el equipo de ventas humano cuando sea necesario

REGLAS DE ESCALADO:
- Transfiere a un humano cuando detectes estas palabras clave: ${data.customConfig.escalationRules.keywords.join(', ')}
- Transfiere automáticamente después de ${data.customConfig.escalationRules.autoTransferAfter} intentos fallidos
- ${data.customConfig.escalationRules.workingHours ? 'Solo transferir durante horario laboral' : 'Transferir en cualquier momento'}

CAPTURA DE LEADS:
${data.customConfig.leadCapture.enabled ? `
- Captura obligatoriamente: ${data.customConfig.leadCapture.requiredFields.join(', ')}
- Califica por: presupuesto, timeline y toma de decisiones
` : '- Captura de leads deshabilitada'}

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

  // Función para cargar workflows disponibles
  const loadAvailableWorkflows = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingWorkflows(true);
    try {
      const response = await workflowService.getWorkflowsByUser(user.id);
      if (response.success) {
        setAvailableWorkflows(response.data || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los workflows',
        variant: 'destructive',
      });
    } finally {
      setLoadingWorkflows(false);
    }
  }, [user?.id, toast]);

  // Funciones para manejar la selección de workflows
  const handleWorkflowSelection = (workflow: WorkflowResponse, isSelected: boolean) => {
    if (isSelected) {
      // Agregar workflow
      const newSelection: WorkflowSelection = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isPrimary: selectedWorkflows.length === 0, // El primero es principal por defecto
        executionOrder: selectedWorkflows.length + 1
      };
      setSelectedWorkflows(prev => [...prev, newSelection]);
    } else {
      // Remover workflow
      setSelectedWorkflows(prev => {
        const filtered = prev.filter(w => w.id !== workflow.id);
        // Reajustar orden
        return filtered.map((w, index) => ({
          ...w,
          executionOrder: index + 1,
          isPrimary: index === 0 // El primero siempre es principal
        }));
      });
    }
  };

  const setPrimaryWorkflow = (workflowId: string) => {
    setSelectedWorkflows(prev => 
      prev.map(w => ({
        ...w,
        isPrimary: w.id === workflowId
      }))
    );
  };

  const moveWorkflow = (workflowId: string, direction: 'up' | 'down') => {
    setSelectedWorkflows(prev => {
      const index = prev.findIndex(w => w.id === workflowId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newArray = [...prev];
      [newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];
      
      // Reajustar orden
      return newArray.map((w, i) => ({
        ...w,
        executionOrder: i + 1
      }));
    });
  };

  // Filtrar workflows disponibles
  const filteredWorkflows = availableWorkflows.filter(workflow =>
    workflow.name.toLowerCase().includes(workflowSearchTerm.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(workflowSearchTerm.toLowerCase())
  );

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen && !isEditing) {
      setCurrentStep('whatsapp-linking');
      setWhatsappSession(null);
      setSelectedWorkflows([]);
      setWorkflowSearchTerm('');
      setFormData({ 
        name: '', 
        description: '', 
        prompt: '',
        businessType: '',
        businessInfo: '',
        targetAudience: '',
        conversationalGoal: 'sales',
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
      loadAvailableWorkflows(); // Cargar workflows al abrir el modal
    }
  }, [isOpen, isEditing, loadAvailableWorkflows]);

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
            setCurrentStep('workflow-selection');
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

    if (!formData.name.trim() || !formData.prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    if (selectedWorkflows.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona al menos un workflow',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Creating agent with workflows:', selectedWorkflows);
      
      // Generar prompt inteligente basado en la configuración de negocio
      const enhancedPrompt = generateBusinessPrompt(formData);
      
      // Preparar datos para enviar a la API
      const agentData: CreateAgentRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        platform: 'whatsapp',
        prompt: enhancedPrompt,
        workflowId: whatsappSession.sessionName, // Para compatibilidad
        workflowIds: selectedWorkflows.map(w => w.id),
        primaryWorkflowId: selectedWorkflows.find(w => w.isPrimary)?.id,
        platformConfig: JSON.stringify({
          sessionName: whatsappSession.sessionName,
          isConnected: true,
          connectedAt: new Date().toISOString(),
          timestamp: whatsappSession.timestamp,
          workflows: selectedWorkflows,
          businessType: formData.businessType,
          conversationalGoal: formData.conversationalGoal,
          targetAudience: formData.targetAudience,
          businessInfo: formData.businessInfo
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
        description: `¡Agente "${formData.name}" creado con ${selectedWorkflows.length} workflow(s)!`,
      });
      
      // Limpiar el formulario
      setFormData({
        name: '',
        description: '',
        prompt: '',
        businessType: '',
        businessInfo: '',
        targetAudience: '',
        conversationalGoal: 'sales',
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

      case 'workflow-selection':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Selecciona Workflows</h3>
              <p className="text-muted-foreground">
                Elige los workflows que procesarán los mensajes de WhatsApp
              </p>
            </div>

            <div className="space-y-4">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar workflows..."
                  value={workflowSearchTerm}
                  onChange={(e) => setWorkflowSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de workflows */}
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4 space-y-2">
                  {loadingWorkflows ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Cargando workflows...</p>
                    </div>
                  ) : filteredWorkflows.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {workflowSearchTerm ? 'No se encontraron workflows' : 'No tienes workflows guardados'}
                      </p>
                    </div>
                  ) : (
                    filteredWorkflows.map((workflow) => {
                      const isSelected = selectedWorkflows.some(w => w.id === workflow.id);
                      return (
                        <div
                          key={workflow.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            id={workflow.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleWorkflowSelection(workflow, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={workflow.id}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {workflow.name}
                            </label>
                            {workflow.description && (
                              <p className="text-sm text-muted-foreground">
                                {workflow.description}
                              </p>
                            )}
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {workflow.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Workflows seleccionados */}
              {selectedWorkflows.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Workflows Seleccionados ({selectedWorkflows.length})</h4>
                  <div className="space-y-2">
                    {selectedWorkflows
                      .sort((a, b) => a.executionOrder - b.executionOrder)
                      .map((workflow, index) => (
                        <div
                          key={workflow.id}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium bg-primary text-primary-foreground px-2 py-1 rounded">
                              {workflow.executionOrder}
                            </span>
                            <div>
                              <p className="font-medium text-sm">{workflow.name}</p>
                              {workflow.description && (
                                <p className="text-xs text-muted-foreground">{workflow.description}</p>
                              )}
                            </div>
                            {workflow.isPrimary && (
                              <Badge variant="default" className="ml-2">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveWorkflow(workflow.id, 'up')}
                              disabled={index === 0}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveWorkflow(workflow.id, 'down')}
                              disabled={index === selectedWorkflows.length - 1}
                            >
                              ↓
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
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
                type="button"
                onClick={() => setCurrentStep('business-config')}
                disabled={selectedWorkflows.length === 0}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case 'business-config':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Configura tu Negocio</h3>
              <p className="text-muted-foreground">
                Personaliza tu agente para tu tipo de negocio y objetivos
              </p>
            </div>

            <div className="space-y-6">
              {/* Tipo de Negocio */}
              <div>
                <Label htmlFor="businessType">Tipo de Negocio</Label>
                <select
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => handleChange('businessType', e.target.value)}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  required
                >
                  <option value="">Selecciona tu tipo de negocio</option>
                  <option value="restaurant">Restaurante</option>
                  <option value="retail">Tienda/Retail</option>
                  <option value="services">Servicios</option>
                  <option value="healthcare">Salud</option>
                  <option value="education">Educación</option>
                  <option value="real_estate">Bienes Raíces</option>
                  <option value="automotive">Automotriz</option>
                  <option value="beauty">Belleza/Spa</option>
                  <option value="travel">Viajes/Turismo</option>
                  <option value="technology">Tecnología</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Objetivo Conversacional */}
              <div>
                <Label>Objetivo Principal</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value: 'sales', label: '💰 Ventas', desc: 'Vender productos/servicios' },
                    { value: 'reservations', label: '📅 Reservas', desc: 'Reservar citas/mesas' },
                    { value: 'support', label: '🛠️ Soporte', desc: 'Atención al cliente' },
                    { value: 'lead_generation', label: '🎯 Leads', desc: 'Capturar prospectos' }
                  ].map((goal) => (
                    <Card
                      key={goal.value}
                      className={`cursor-pointer transition-all ${
                        formData.conversationalGoal === goal.value
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleChange('conversationalGoal', goal.value)}
                    >
                      <CardContent className="p-3 text-center">
                        <div className="text-lg mb-1">{goal.label}</div>
                        <div className="text-xs text-muted-foreground">{goal.desc}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Funcionalidades Incluidas */}
              <div>
                <Label className="text-base font-semibold text-green-600">
                  ✅ Funcionalidades Incluidas
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  {[
                    { key: 'attend24_7', label: '🕐 Atender consultas 24/7', enabled: true },
                    { key: 'autoFAQ', label: '❓ Responder preguntas frecuentes automáticamente', enabled: true },
                    { key: 'guideCustomers', label: '🛍️ Guiar a los clientes para comprar/reservar', enabled: true },
                    { key: 'qualifyLeads', label: '🎯 Calificar y filtrar prospectos reales', enabled: true },
                    { key: 'humanEscalation', label: '👤 Escalado a humanos cuando sea necesario', enabled: true },
                    { key: 'salesIntegration', label: '📊 Integrarse con un equipo de ventas', enabled: true }
                  ].map((feature) => (
                    <div key={feature.key} className="flex items-center gap-2">
                      <div className="text-sm font-medium text-green-700 dark:text-green-300">
                        {feature.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información del Negocio */}
              <div>
                <Label htmlFor="businessInfo">Información de tu Negocio</Label>
                <Textarea
                  id="businessInfo"
                  value={formData.businessInfo}
                  onChange={(e) => handleChange('businessInfo', e.target.value)}
                  placeholder="Describe tu negocio: productos/servicios, horarios, ubicación, precios, promociones especiales..."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta información será usada para entrenar a tu agente IA
                </p>
              </div>

              {/* Audiencia Objetivo */}
              <div>
                <Label htmlFor="targetAudience">Audiencia Objetivo</Label>
                <Input
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => handleChange('targetAudience', e.target.value)}
                  placeholder="Ej: Familias con niños, profesionales jóvenes, empresas locales..."
                  required
                />
              </div>

              {/* Configuración de Escalado */}
              <div className="border rounded-lg p-4">
                <Label className="text-sm font-semibold">Escalado a Humanos</Label>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label htmlFor="escalationKeywords" className="text-xs">Palabras clave para transferir</Label>
                    <Input
                      id="escalationKeywords"
                      value={formData.customConfig.escalationRules.keywords.join(', ')}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map(k => k.trim());
                        setFormData(prev => ({
                          ...prev,
                          customConfig: {
                            ...prev.customConfig,
                            escalationRules: {
                              ...prev.customConfig.escalationRules,
                              keywords
                            }
                          }
                        }));
                      }}
                      placeholder="hablar con humano, quiero comprar, problema urgente"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="workingHours"
                      checked={formData.customConfig.escalationRules.workingHours}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          customConfig: {
                            ...prev.customConfig,
                            escalationRules: {
                              ...prev.customConfig.escalationRules,
                              workingHours: e.target.checked
                            }
                          }
                        }));
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="workingHours" className="text-xs">
                      Solo durante horario laboral
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep('workflow-selection')}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep('agent-config')}
                disabled={!formData.businessType || !formData.businessInfo || !formData.targetAudience}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
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
                onClick={() => setCurrentStep('business-config')}
                className="flex-1"
              >
                Atrás
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
