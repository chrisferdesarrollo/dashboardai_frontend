import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgentStore } from '@/store/agentStore';
import { Agent, CreateAgentInput, PlatformType } from '@/types/agent';
import { CreateAgentRequest } from '@/services/agentApi';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon, TelegramIcon } from '@/components/ui/platform-icons';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent | null;
}

export function AgentModal({ isOpen, onClose, agent }: AgentModalProps) {
  const { createAgent, updateAgent, loading } = useAgentStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'whatsapp' as PlatformType,
    workflowId: '',
    apiKeys: '',
    prompts: '',
    variables: '',
  });

  const isEditing = !!agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        platform: agent.platform,
        workflowId: agent.workflowId,
        apiKeys: JSON.stringify(agent.settings.apiKeys, null, 2),
        prompts: JSON.stringify(agent.settings.prompts, null, 2),
        variables: JSON.stringify(agent.settings.variables, null, 2),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        platform: 'whatsapp' as PlatformType,
        workflowId: '',
        apiKeys: '{}',
        prompts: '{}',
        variables: '{}',
      });
    }
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar JSON
      const apiKeys = JSON.parse(formData.apiKeys);
      const prompts = JSON.parse(formData.prompts);
      const variables = JSON.parse(formData.variables);

      // Convertir CreateAgentInput a CreateAgentRequest
      const agentData: CreateAgentRequest = {
        name: formData.name,
        description: formData.description,
        platform: formData.platform,
        prompt: prompts.system || prompts.user || 'Eres un asistente útil',
        workflowId: formData.workflowId,
        platformConfig: JSON.stringify({
          apiKeys,
          prompts,
          variables,
        }),
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
          description: 'El agente se ha creado correctamente.',
        });
      }

      onClose();
    } catch (error) {
      toast({
        title: 'Error en configuración JSON',
        description: 'Verifica que los campos JSON tengan el formato correcto.',
        variant: 'destructive',
      });
    }
  };

  const handleChange = (field: string, value: string | PlatformType) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Agente' : 'Crear Nuevo Agente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Agente</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Agente de Atención al Cliente"
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
              <Label htmlFor="platform">Plataforma</Label>
              <Select 
                value={formData.platform} 
                onValueChange={(value: PlatformType) => handleChange('platform', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <WhatsAppIcon size={16} />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="telegram">
                    <div className="flex items-center gap-2">
                      <TelegramIcon size={16} />
                      Telegram
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="workflowId">ID del Workflow en n8n</Label>
              <Input
                id="workflowId"
                value={formData.workflowId}
                onChange={(e) => handleChange('workflowId', e.target.value)}
                placeholder="Ej: wf_abc123"
                required
              />
            </div>
          </div>

          {/* Configuración avanzada */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuración</h3>
            
            <div>
              <Label htmlFor="apiKeys">API Keys (JSON)</Label>
              <Textarea
                id="apiKeys"
                value={formData.apiKeys}
                onChange={(e) => handleChange('apiKeys', e.target.value)}
                placeholder='{"openai": "sk-...", "huggingface": "hf_..."}'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato JSON con las claves de API necesarias
              </p>
            </div>

            <div>
              <Label htmlFor="prompts">Prompts (JSON)</Label>
              <Textarea
                id="prompts"
                value={formData.prompts}
                onChange={(e) => handleChange('prompts', e.target.value)}
                placeholder='{"system": "Eres un asistente útil", "user": "Responde de forma concisa"}'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prompts del sistema y usuario en formato JSON
              </p>
            </div>

            <div>
              <Label htmlFor="variables">Variables (JSON)</Label>
              <Textarea
                id="variables"
                value={formData.variables}
                onChange={(e) => handleChange('variables', e.target.value)}
                placeholder='{"temperature": 0.7, "max_tokens": 1000}'
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variables de configuración en formato JSON
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}