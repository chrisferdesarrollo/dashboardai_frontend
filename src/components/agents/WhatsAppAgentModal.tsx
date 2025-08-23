import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WhatsAppIcon } from '@/components/ui/platform-icons';
import { ArrowLeft } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent, CreateAgentInput } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  agent?: Agent | null;
}

export function WhatsAppAgentModal({ isOpen, onClose, onBack, agent }: WhatsAppAgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phoneNumber: '',
    accessToken: '',
    webhookVerifyToken: '',
    systemPrompt: '',
    welcomeMessage: '',
  });

  const isEditing = !!agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        phoneNumber: agent.settings.variables?.phoneNumber || '',
        accessToken: agent.settings.apiKeys?.whatsapp || '',
        webhookVerifyToken: agent.settings.variables?.webhookVerifyToken || '',
        systemPrompt: agent.settings.prompts?.system || '',
        welcomeMessage: agent.settings.prompts?.welcome || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        phoneNumber: '',
        accessToken: '',
        webhookVerifyToken: '',
        systemPrompt: '',
        welcomeMessage: '',
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const agentData: CreateAgentInput = {
        name: formData.name,
        description: formData.description,
        platform: 'whatsapp',
        workflowId: `whatsapp_${Date.now()}`, // Generar ID temporal
        settings: {
          apiKeys: {
            whatsapp: formData.accessToken,
          },
          prompts: {
            system: formData.systemPrompt,
            welcome: formData.welcomeMessage,
          },
          variables: {
            phoneNumber: formData.phoneNumber,
            webhookVerifyToken: formData.webhookVerifyToken,
            platform: 'whatsapp',
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

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error al procesar el agente de WhatsApp.',
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
            <WhatsAppIcon size={20} />
            <DialogTitle>
              {isEditing ? 'Editar Agente de WhatsApp' : 'Crear Agente de WhatsApp'}
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
                placeholder="Ej: Agente de Atención WhatsApp"
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

          {/* Configuración de WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-600">
              Configuración de WhatsApp
            </h3>
            
            <div>
              <Label htmlFor="phoneNumber">Número de Teléfono</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                placeholder="+1234567890"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Número de WhatsApp Business registrado
              </p>
            </div>

            <div>
              <Label htmlFor="accessToken">Token de Acceso</Label>
              <Input
                id="accessToken"
                type="password"
                value={formData.accessToken}
                onChange={(e) => handleChange('accessToken', e.target.value)}
                placeholder="Token de WhatsApp Business API"
                required
              />
            </div>

            <div>
              <Label htmlFor="webhookVerifyToken">Token de Verificación Webhook</Label>
              <Input
                id="webhookVerifyToken"
                value={formData.webhookVerifyToken}
                onChange={(e) => handleChange('webhookVerifyToken', e.target.value)}
                placeholder="Token para verificar webhooks"
                required
              />
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
                placeholder="Eres un asistente de atención al cliente para WhatsApp..."
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
                placeholder="¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte?"
                rows={3}
              />
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
