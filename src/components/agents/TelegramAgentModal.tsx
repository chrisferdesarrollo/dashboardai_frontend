import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Bot, CheckCircle, ExternalLink, Loader2, Check, X } from 'lucide-react';
import { TelegramIcon } from '@/components/ui/platform-icons';
import { useAgentStore } from '@/store/agentStore';
import { telegramApi } from '@/services/telegramApi';
import { useToast } from '@/hooks/use-toast';

interface TelegramAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  isEditing?: boolean;
  initialAgent?: {
    id?: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    botToken?: string;
  };
}

type CreationStep = 'telegram-bot-setup' | 'agent-config' | 'completed';

interface BotValidationResult {
  tokenValid?: boolean;
  botInfo?: {
    id: number;
    first_name: string;
    username?: string;
  } | null;
  errorMessage?: string;
}

interface TelegramFormData {
  // Bot setup fields
  botToken: string;
  
  // Agent config fields
  name: string;
  description: string;
  systemPrompt: string;
  
  // Webhook data
  webhookUrl: string;
  
  customConfig: {
    escalationRules: {
      keywords: string[];
      workingHours: boolean;
    };
  };
}

const initialFormData: TelegramFormData = {
  botToken: '',
  name: '',
  description: '',
  systemPrompt: '',
  webhookUrl: 'https://n8n.topias.app/webhook/telegram-api',
  customConfig: {
    escalationRules: {
      keywords: ['hablar con humano', 'quiero comprar', 'problema urgente'],
      workingHours: false,
    },
  },
};

export function TelegramAgentModal({ 
  isOpen, 
  onClose, 
  onBack, 
  isEditing = false, 
  initialAgent 
}: TelegramAgentModalProps) {
  const { createAgent, updateAgent } = useAgentStore();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<CreationStep>('telegram-bot-setup');
  const [formData, setFormData] = useState<TelegramFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingBot, setIsValidatingBot] = useState(false);
  const [botValidation, setBotValidation] = useState<BotValidationResult>({});

  const resetModalState = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep('telegram-bot-setup');
    setBotValidation({});
    setIsValidatingBot(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isEditing && initialAgent) {
      // Cargar datos del agente para edición
      const agentData = {
        ...initialFormData,
        name: initialAgent.name || '',
        description: initialAgent.description || '',
        systemPrompt: initialAgent.systemPrompt || '',
        botToken: initialAgent.botToken || '',
      };
      setFormData(agentData);
      setCurrentStep('agent-config');
    } else {
      resetModalState();
    }
  }, [isEditing, initialAgent, isOpen, resetModalState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    try {
      // Validar que el bot esté validado correctamente
      if (!botValidation.tokenValid || !botValidation.botInfo) {
        toast({
          title: 'Error',
          description: 'Por favor valida el token del bot antes de crear el agente',
          variant: 'destructive',
        });
        return;
      }

      // Preparar datos para enviar a la API
      const botId = botValidation.botInfo?.id?.toString() || Date.now().toString();
      const botName = botValidation.botInfo?.username || botValidation.botInfo?.first_name || `bot_${botId}`;
      
      // Generar sessionName único para Telegram (similar a WhatsApp)
      const sessionName = `telegram_agent_${Date.now()}`;
      
      const platformConfig = {
        botToken: formData.botToken,
        botId: botId,
        botName: botName, // Nombre real del bot
        botUsername: botValidation.botInfo?.username,
        botFirstName: botValidation.botInfo?.first_name,
        webhookUrl: formData.webhookUrl,
        variables: {
          platform: 'telegram',
        },
      };

      const agentData = {
        name: formData.name,
        description: formData.description,
        platform: 'telegram' as const,
        prompt: formData.systemPrompt,
        sessionName: sessionName,
        workflowId: `telegram_${Date.now()}`,
        platformConfig: JSON.stringify(platformConfig),
      };

      if (isEditing && initialAgent?.id) {
        // TODO: Implementar actualización correcta
        toast({
          title: "Función en desarrollo",
          description: "La edición de agentes estará disponible pronto",
          variant: "destructive",
        });
      } else {
        // Primero conectar el bot de Telegram al webhook
        try {
          console.log('🤖 Conectando bot de Telegram al webhook...');
          const telegramResult = await telegramApi.connectTelegramAgent(formData.botToken);
          
          if (!telegramResult.success) {
            throw new Error(telegramResult.message || 'Error conectando el bot de Telegram');
          }
          
          console.log('✅ Bot de Telegram conectado exitosamente');
        } catch (telegramError: unknown) {
          console.error('❌ Error conectando bot de Telegram:', telegramError);
          throw new Error(telegramError instanceof Error ? telegramError.message : 'Error conectando bot de Telegram');
        }

        // Luego crear el agente en el sistema
        await createAgent(agentData);
        
        setCurrentStep('completed');
        toast({
          title: "Agente creado",
          description: `¡Agente "${formData.name}" creado exitosamente y conectado a Telegram!`,
        });
        
        // Auto cerrar después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Error al crear/actualizar agente:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error al procesar el agente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof TelegramFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBackButton = () => {
    if (currentStep === 'telegram-bot-setup' && !isEditing) {
      resetModalState(); // Resetear estado antes de volver atrás
      onBack();
    } else if (currentStep === 'agent-config') {
      if (isEditing) {
        resetModalState(); // Resetear estado antes de cerrar
        onClose();
      } else {
        setCurrentStep('telegram-bot-setup');
      }
    }
  };

  const handleModalClose = () => {
    resetModalState(); // Resetear completamente el estado
    onClose();
  };

  const validateBotToken = async (token: string) => {
    if (!token || token.trim() === '') {
      setBotValidation({});
      return;
    }

    setIsValidatingBot(true);
    setBotValidation({});

    try {
      const isValid = await telegramApi.validateBotToken(token);
      
      if (isValid) {
        const botInfo = await telegramApi.getBotInfo(token);
        setBotValidation({
          tokenValid: true,
          botInfo: botInfo,
        });
      } else {
        setBotValidation({
          tokenValid: false,
          errorMessage: 'Token inválido o bot no encontrado',
        });
      }
    } catch (error: unknown) {
      setBotValidation({
        tokenValid: false,
        errorMessage: error instanceof Error ? error.message : 'Error al validar el token',
      });
    } finally {
      setIsValidatingBot(false);
    }
  };

  const validateBotSetup = () => {
    return formData.botToken && 
           formData.botToken.trim() !== '' && 
           botValidation.tokenValid === true;
  };

  const configureTelegramBot = async () => {
    if (!validateBotSetup()) return;
    
    // Validar que el token sea válido antes de continuar
    if (botValidation.tokenValid) {
      setCurrentStep('agent-config');
    } else {
      // Si no está validado, validar primero
      setIsLoading(true);
      try {
        await validateBotToken(formData.botToken);
        // Note: El estado se actualizará pero necesitamos verificar después del estado actual
        setTimeout(() => {
          if (botValidation.tokenValid) {
            setCurrentStep('agent-config');
          } else {
            toast({
              title: "Token inválido",
              description: "Por favor verifica el token del bot",
              variant: "destructive",
            });
          }
        }, 100);
      } catch (error) {
        toast({
          title: "Error de validación",
          description: "No se pudo validar el token del bot",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'telegram-bot-setup':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Configurar Bot de Telegram</h3>
              <p className="text-muted-foreground">
                Crea tu bot en Telegram y conecta el token
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Bot className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">Crear Bot en Telegram</h4>
                      <p className="text-sm text-muted-foreground">Usa @BotFather para crear tu bot y obtener el token</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => window.open('https://t.me/botfather', '_blank')}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir @BotFather en Telegram
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulario para ingresar el token del bot */}
            <div className="space-y-4">
              <h4 className="font-semibold">Token del Bot</h4>
              
              <div>
                <Label htmlFor="botToken">Bot Token</Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type="password"
                    value={formData.botToken}
                    onChange={(e) => {
                      handleChange('botToken', e.target.value);
                      // Validar automáticamente después de un pequeño delay
                      setTimeout(() => {
                        validateBotToken(e.target.value);
                      }, 500);
                    }}
                    placeholder="1234844390:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    required
                    className={`pr-10 placeholder:text-muted-foreground/40 ${
                      botValidation.tokenValid === true ? 'border-green-500' :
                      botValidation.tokenValid === false ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isValidatingBot ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : botValidation.tokenValid === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : botValidation.tokenValid === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Token proporcionado por @BotFather
                </p>
                {botValidation.tokenValid === true && botValidation.botInfo && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Bot "{botValidation.botInfo.first_name}" conectado exitosamente
                  </p>
                )}
                {botValidation.tokenValid === false && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {botValidation.errorMessage || 'Token inválido'}
                  </p>
                )}
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
                onClick={configureTelegramBot}
                disabled={!validateBotSetup() || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : botValidation.tokenValid ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Continuar
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Validar y Continuar
                  </>
                )}
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
                Define el nombre y comportamiento de tu agente de Telegram
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
                <Label htmlFor="systemPrompt">Prompt del Sistema</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
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
                  onClose();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  isEditing ? 'Actualizar Agente' : 'Crear Agente'
                )}
              </Button>
            </div>
          </form>
        );

      case 'completed':
        return (
          <div className="text-center space-y-6 py-4">
            {/* Logo animado con efecto de éxito */}
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              {/* Anillo de fondo pulsante */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-800 success-ring" />
              
              {/* Logo con animación de éxito */}
              <div className="relative z-10">
                <img 
                  src="/iconoTopias.png" 
                  alt="TopIA's Success" 
                  className="h-20 w-20 object-contain logo-success"
                />
              </div>
              
              {/* Icono de check pequeño en la esquina */}
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-4 border-background shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                ¡Agente creado exitosamente!
              </h3>
              <p className="text-muted-foreground text-base">
                Tu agente de Telegram está listo para usar
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
            <TelegramIcon size={20} />
            <DialogTitle>
              {isEditing ? 'Editar Agente de Telegram' : 'Crear Agente de Telegram'}
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