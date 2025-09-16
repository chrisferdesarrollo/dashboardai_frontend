import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TelegramIcon } from '@/components/ui/platform-icons';
import { ArrowLeft, Bot, ExternalLink, CheckCircle, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent, CreateAgentInput } from '@/types/agent';
import { CreateAgentRequest } from '@/services/agentApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { telegramApi } from '@/services/telegramApi';

interface TelegramAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  agent?: Agent | null;
}

type CreationStep = 'telegram-bot-setup' | 'business-config' | 'agent-config' | 'completed';

export function TelegramAgentModal({ isOpen, onClose, onBack, agent }: TelegramAgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<CreationStep>('telegram-bot-setup');
  const [isLoading, setIsLoading] = useState(false);
  const [botSetupCompleted, setBotSetupCompleted] = useState(false);
  
  // Estados para validación del bot
  const [isValidatingBot, setIsValidatingBot] = useState(false);
  const [botValidation, setBotValidation] = useState<{
    tokenValid: boolean | null;
    botInfo: { id: number; first_name: string; username: string; is_bot: boolean } | null;
    errorMessage: string;
  }>({
    tokenValid: null,
    botInfo: null,
    errorMessage: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    botToken: '',
    botUsername: '',
    systemPrompt: '',
    welcomeMessage: '',
    commandsHelp: '',
    // Business config fields
    businessType: '',
    businessInfo: '',
    targetAudience: '',
    conversationalGoal: 'sales' as 'sales' | 'support' | 'reservations' | 'info',
  });

  const isEditing = !!agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        botToken: (agent.settings.apiKeys?.telegram as string) || '',
        botUsername: (agent.settings.variables?.botUsername as string) || '',
        systemPrompt: (agent.settings.prompts?.system as string) || '',
        welcomeMessage: (agent.settings.prompts?.welcome as string) || '',
        commandsHelp: (agent.settings.prompts?.commands as string) || '',
        businessType: '',
        businessInfo: '',
        targetAudience: '',
        conversationalGoal: 'sales',
      });
      // If editing, skip bot setup
      setCurrentStep('agent-config');
      setBotSetupCompleted(true);
    } else {
      setFormData({
        name: '',
        description: '',
        botToken: '',
        botUsername: '',
        systemPrompt: '',
        welcomeMessage: '',
        commandsHelp: '',
        businessType: '',
        businessInfo: '',
        targetAudience: '',
        conversationalGoal: 'sales',
      });
      setCurrentStep('telegram-bot-setup');
      setBotSetupCompleted(false);
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.botToken || !formData.botUsername) {
      toast({
        title: 'Error',
        description: 'Por favor completa la configuración del bot de Telegram',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar datos para enviar a la API
      const agentData: CreateAgentRequest = {
        name: formData.name,
        description: formData.description,
        platform: 'telegram',
        prompt: formData.systemPrompt,
        workflowId: `telegram_${Date.now()}`, // Generar ID temporal
        platformConfig: JSON.stringify({
          botToken: formData.botToken,
          botUsername: formData.botUsername,
          businessType: formData.businessType,
          conversationalGoal: formData.conversationalGoal,
          targetAudience: formData.targetAudience,
          businessInfo: formData.businessInfo,
          prompts: {
            system: formData.systemPrompt,
            welcome: formData.welcomeMessage,
            commands: formData.commandsHelp,
          },
          variables: {
            botUsername: formData.botUsername,
            platform: 'telegram',
          },
        }),
        userId: user?.id
      };

      if (isEditing && agent) {
        // TODO: Implementar actualización
        toast({
          title: 'Función en desarrollo',
          description: 'La edición de agentes estará disponible pronto.',
          variant: 'destructive',
        });
      } else {
        await createAgent(agentData);
        toast({
          title: 'Agente creado',
          description: `¡Agente "${formData.name}" creado exitosamente!`,
        });
        
        // Mostrar paso completado
        setCurrentStep('completed');
        
        // Cerrar el modal después de 2 segundos
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error al procesar el agente de Telegram.',
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

  const handleBackButton = () => {
    if (currentStep === 'telegram-bot-setup' && !isEditing) {
      onBack();
    } else if (currentStep === 'business-config') {
      setCurrentStep('telegram-bot-setup');
    } else if (currentStep === 'agent-config') {
      if (isEditing) {
        onClose();
      } else {
        setCurrentStep('business-config');
      }
    }
  };

  const handleModalClose = () => {
    setCurrentStep('telegram-bot-setup');
    setBotSetupCompleted(false);
    onClose();
  };

  const validateBotSetup = () => {
    return formData.botToken.trim() && formData.botUsername.trim() && botValidation.tokenValid === true;
  };

  const validateBotToken = async (token: string) => {
    if (!token.trim()) {
      setBotValidation({
        tokenValid: null,
        botInfo: null,
        errorMessage: ''
      });
      return;
    }

    setIsValidatingBot(true);
    setBotValidation({
      tokenValid: null,
      botInfo: null,
      errorMessage: ''
    });

    try {
      const isValid = await telegramApi.validateBotToken(token);
      
      if (isValid) {
        const botInfo = await telegramApi.getBotInfo(token);
        setBotValidation({
          tokenValid: true,
          botInfo: botInfo,
          errorMessage: ''
        });
        
        // Auto-completar el username si no está lleno
        if (!formData.botUsername && botInfo.username) {
          handleChange('botUsername', `@${botInfo.username}`);
        }
        
        toast({
          title: 'Token válido',
          description: `Bot "${botInfo.first_name}" conectado correctamente`,
        });
      } else {
        setBotValidation({
          tokenValid: false,
          botInfo: null,
          errorMessage: 'Token de bot inválido'
        });
      }
    } catch (error) {
      setBotValidation({
        tokenValid: false,
        botInfo: null,
        errorMessage: 'Error validando el token del bot'
      });
    } finally {
      setIsValidatingBot(false);
    }
  };

  const configureTelegramBot = async () => {
    if (!formData.botToken || !formData.botUsername) {
      toast({
        title: 'Error',
        description: 'Por favor completa el Token y Username del bot',
        variant: 'destructive',
      });
      return;
    }

    // Si el token ya está validado correctamente, permitir continuar
    if (botValidation.tokenValid && botValidation.botInfo) {
      setBotSetupCompleted(true);
      toast({
        title: '✅ Bot validado',
        description: `Bot ${botValidation.botInfo.first_name} listo para configurar`,
      });
      setCurrentStep('business-config');
      return;
    }

    // Si no está validado, intentar validar primero
    try {
      setIsLoading(true);
      
      const isValid = await telegramApi.validateBotToken(formData.botToken);
      
      if (isValid) {
        setBotSetupCompleted(true);
        toast({
          title: '✅ Bot configurado',
          description: 'Bot de Telegram listo para usar',
        });
        setCurrentStep('business-config');
      } else {
        toast({
          title: 'Error',
          description: 'Token de bot inválido. Verifica que sea correcto.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      // Si hay error, pero el token se validó anteriormente, permitir continuar
      if (botValidation.tokenValid) {
        setBotSetupCompleted(true);
        toast({
          title: '⚠️ Configuración parcial',
          description: 'Bot validado, continuando con la configuración',
        });
        setCurrentStep('business-config');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Error validando el bot de Telegram';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateBusinessPrompt = (data: typeof formData) => {
    const basePrompt = data.systemPrompt || 'Eres un asistente virtual para Telegram.';
    
    if (!data.businessType || !data.businessInfo) {
      return basePrompt;
    }

    const businessContext = `
Información del negocio:
- Tipo: ${data.businessType}
- Descripción: ${data.businessInfo}
- Audiencia objetivo: ${data.targetAudience}
- Objetivo principal: ${data.conversationalGoal}

${basePrompt}

Comportamiento:
- Sé profesional pero amigable
- Usa la información del negocio para responder
- Si no sabes algo, sé honesto y ofrece ayuda alternativa
- Mantén las conversaciones enfocadas en el objetivo del negocio
`;

    return businessContext.trim();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'telegram-bot-setup':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Configurar Bot de Telegram</h3>
              <p className="text-muted-foreground">
                Primero necesitas crear un bot en Telegram usando BotFather
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Bot className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">Instrucciones para crear tu Bot</h4>
                      <p className="text-sm text-muted-foreground">Sigue estos pasos en Telegram</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Busca @BotFather en Telegram</p>
                        <p className="text-sm text-muted-foreground">Es el bot oficial para crear otros bots</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Envía el comando /newbot</p>
                        <p className="text-sm text-muted-foreground">Para crear un nuevo bot</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Elige un nombre para tu bot</p>
                        <p className="text-sm text-muted-foreground">Ej: "Mi Asistente Virtual"</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Elige un username único</p>
                        <p className="text-sm text-muted-foreground">Debe terminar en "bot" (ej: miasistente_bot)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        5
                      </div>
                      <div>
                        <p className="font-medium">Copia el Token que te da BotFather</p>
                        <p className="text-sm text-muted-foreground">Tendrá formato: 123456789:ABCdefGHI...</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          ¡Importante!
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Guarda bien el Token, lo necesitarás para configurar tu bot. No lo compartas con nadie.
                        </p>
                      </div>
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

            {/* Formulario para ingresar los datos del bot */}
            <div className="space-y-4">
              <h4 className="font-semibold">Configura tu Bot</h4>
              
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
                    placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    required
                    className={`pr-10 ${
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
                    Bot "{botValidation.botInfo.first_name}" conectado
                  </p>
                )}
                {botValidation.tokenValid === false && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {botValidation.errorMessage || 'Token inválido'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="botUsername">Nombre de usuario del Bot</Label>
                <Input
                  id="botUsername"
                  value={formData.botUsername}
                  onChange={(e) => handleChange('botUsername', e.target.value)}
                  placeholder="@miasistente_bot"
                  required
                  className={
                    botValidation.botInfo && formData.botUsername.includes(botValidation.botInfo.username || '') 
                      ? 'border-green-500' : ''
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Username que asignaste al bot (incluye @)
                </p>
                {botValidation.botInfo && botValidation.botInfo.username && (
                  <p className="text-xs text-blue-600 mt-1">
                    Username sugerido: @{botValidation.botInfo.username}
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

      case 'business-config':
        return (
          <div className="space-y-6">
            <div className="text-center">
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
                    { value: 'support', label: '🎧 Soporte', desc: 'Atención al cliente' },
                    { value: 'reservations', label: '📅 Reservas', desc: 'Reservar citas/mesas' },
                    { value: 'info', label: 'ℹ️ Información', desc: 'Brindar información' },
                  ].map((goal) => (
                    <div key={goal.value} className="relative">
                      <input
                        type="radio"
                        id={goal.value}
                        name="conversationalGoal"
                        value={goal.value}
                        checked={formData.conversationalGoal === goal.value}
                        onChange={(e) => handleChange('conversationalGoal', e.target.value)}
                        className="sr-only"
                      />
                      <label
                        htmlFor={goal.value}
                        className={`block p-3 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                          formData.conversationalGoal === goal.value
                            ? 'border-primary bg-primary/5'
                            : 'border-input'
                        }`}
                      >
                        <div className="font-medium text-sm">{goal.label}</div>
                        <div className="text-xs text-muted-foreground">{goal.desc}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información del Negocio */}
              <div>
                <Label htmlFor="businessInfo">Información del Negocio</Label>
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
                  placeholder="Ej: Asistente de Ventas Telegram"
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
                <Label htmlFor="systemPrompt">Prompt del Sistema</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  placeholder="Define cómo debe comportarse tu agente. Ej: Eres un asistente de ventas amigable que ayuda a los clientes..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
                <Textarea
                  id="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                  placeholder="¡Hola! 🤖 Soy tu asistente virtual. Usa /help para ver los comandos disponibles."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="commandsHelp">Ayuda de Comandos</Label>
                <Textarea
                  id="commandsHelp"
                  value={formData.commandsHelp}
                  onChange={(e) => handleChange('commandsHelp', e.target.value)}
                  placeholder="/start - Iniciar conversación&#10;/help - Mostrar ayuda&#10;/info - Información del bot"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Comandos disponibles para el bot
                </p>
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
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando Agente...
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
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">¡Agente creado exitosamente!</h3>
              <p className="text-muted-foreground">
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
