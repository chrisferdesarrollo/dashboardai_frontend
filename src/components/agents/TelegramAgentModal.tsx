import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TelegramIcon } from '@/components/ui/platform-icons';
import { ArrowLeft } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent, CreateAgentInput } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';

interface TelegramAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  agent?: Agent | null;
}

export function TelegramAgentModal({ isOpen, onClose, onBack, agent }: TelegramAgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    botToken: '',
    botUsername: '',
    systemPrompt: '',
    welcomeMessage: '',
    commandsHelp: '',
  });

  const isEditing = !!agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        botToken: agent.settings.apiKeys?.telegram || '',
        botUsername: agent.settings.variables?.botUsername || '',
        systemPrompt: agent.settings.prompts?.system || '',
        welcomeMessage: agent.settings.prompts?.welcome || '',
        commandsHelp: agent.settings.prompts?.commands || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        botToken: '',
        botUsername: '',
        systemPrompt: '',
        welcomeMessage: '',
        commandsHelp: '',
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const agentData: CreateAgentInput = {
        name: formData.name,
        description: formData.description,
        platform: 'telegram',
        workflowId: `telegram_${Date.now()}`, // Generar ID temporal
        settings: {
          apiKeys: {
            telegram: formData.botToken,
          },
          prompts: {
            system: formData.systemPrompt,
            welcome: formData.welcomeMessage,
            commands: formData.commandsHelp,
          },
          variables: {
            botUsername: formData.botUsername,
            platform: 'telegram',
          },
        },
      };

      if (isEditing && agent) {
        await updateAgent({ ...agentData, id: agent.id });
        toast({
          title: 'Agente actualizado',
          description: 'El agente de Telegram se ha actualizado correctamente.',
        });
      } else {
        await createAgent(agentData);
        toast({
          title: 'Agente creado',
          description: 'El agente de Telegram se ha creado correctamente.',
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error al procesar el agente de Telegram.',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información básica</h3>
            
            <div>
              <Label htmlFor="name">Nombre del Agente</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Agente de Atención Telegram"
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
          </div>

          {/* Configuración de Telegram */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-600">
              Configuración de Telegram
            </h3>
            
            <div>
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                type="password"
                value={formData.botToken}
                onChange={(e) => handleChange('botToken', e.target.value)}
                placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Token proporcionado por @BotFather
              </p>
            </div>

            <div>
              <Label htmlFor="botUsername">Nombre de usuario del Bot</Label>
              <Input
                id="botUsername"
                value={formData.botUsername}
                onChange={(e) => handleChange('botUsername', e.target.value)}
                placeholder="@mi_bot"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Nombre de usuario asignado al bot (incluye @)
              </p>
            </div>
          </div>

          {/* Configuración de IA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personalidad del Agente</h3>
            
            <div>
              <Label htmlFor="systemPrompt">Prompt del Sistema</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                placeholder="Eres un asistente de atención al cliente para Telegram..."
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'} Agente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
