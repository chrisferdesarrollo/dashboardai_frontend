import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Save, X, Copy, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import agentTemplateApi, { AgentTemplate, CreateAgentTemplateRequest } from '@/services/agentTemplateApi';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { TemplateLinkModal } from '@/components/agents/TemplateLinkModal';
import { TelegramAgentModal } from '@/components/agents/TelegramAgentModal';
import { WhatsAppAgentModal } from '@/components/agents/WhatsAppAgentModal';
import { DeleteTemplateDialog } from '@/components/agents/DeleteTemplateDialog';

const AgentTemplates = () => {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Estados para modales de vinculación
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [templateForAgent, setTemplateForAgent] = useState<AgentTemplate | null>(null);

  // Estados para modal de eliminación
  const [templateToDelete, setTemplateToDelete] = useState<AgentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verificar si el usuario es admin
  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;

  const [formData, setFormData] = useState<CreateAgentTemplateRequest>({
    name: '',
    description: '',
    systemPrompt: '',
    knowledgeBaseId: '',
    knowledgeBaseName: '',
    isActive: true,
  });

  // Cargar templates
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await agentTemplateApi.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Error al cargar templates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      knowledgeBaseId: '',
      knowledgeBaseName: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Crear o actualizar template
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.systemPrompt) {
      toast({
        title: 'Error',
        description: 'El nombre y el prompt del sistema son requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingId) {
        await agentTemplateApi.update(editingId, formData);
        toast({
          title: 'Éxito',
          description: 'Template actualizado correctamente',
        });
      } else {
        await agentTemplateApi.create(formData);
        toast({
          title: 'Éxito',
          description: 'Template creado correctamente',
        });
      }
      
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error al guardar template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el template',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar template
  const handleEdit = (template: AgentTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      systemPrompt: template.systemPrompt,
      knowledgeBaseId: template.knowledgeBaseId || '',
      knowledgeBaseName: template.knowledgeBaseName || '',
      isActive: template.isActive,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  // Eliminar template
  const handleDelete = async (template: AgentTemplate) => {
    if (!isAdmin) {
      toast({
        title: 'Acceso Denegado',
        description: 'Solo los administradores pueden eliminar templates',
        variant: 'destructive',
      });
      return;
    }
    setTemplateToDelete(template);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      await agentTemplateApi.delete(templateToDelete.id);
      toast({
        title: 'Éxito',
        description: 'Template eliminado correctamente',
      });
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error('Error al eliminar template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el template',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setTemplateToDelete(null);
    setIsDeleting(false);
  };

  // Duplicar template
  const handleDuplicate = (template: AgentTemplate) => {
    setFormData({
      name: `${template.name} (Copia)`,
      description: template.description || '',
      systemPrompt: template.systemPrompt,
      knowledgeBaseId: template.knowledgeBaseId || '',
      knowledgeBaseName: template.knowledgeBaseName || '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(true);
  };

  // Abrir modal de vinculación
  const handleLink = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setShowLinkModal(true);
  };

  // Manejar selección de plataforma
  const handlePlatformSelect = (platform: 'telegram' | 'whatsapp', template: AgentTemplate) => {
    setTemplateForAgent(template);
    setShowLinkModal(false);
    
    // Incrementar contador de uso
    agentTemplateApi.getById(template.id).then(() => {
      // El contador se incrementará en el backend cuando se use el template
    });

    if (platform === 'telegram') {
      setShowTelegramModal(true);
    } else {
      setShowWhatsAppModal(true);
    }
  };

  // Cerrar modales de agentes
  const handleCloseAgentModal = () => {
    setShowTelegramModal(false);
    setShowWhatsAppModal(false);
    setTemplateForAgent(null);
    // Recargar templates para actualizar contador de uso
    loadTemplates();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agentes Predeterminados</h1>
          <p className="text-muted-foreground mt-2">
            Crea y gestiona plantillas de agentes para Telegram y WhatsApp
          </p>
        </div>
        
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)} 
            className="gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo Template
          </Button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar' : 'Crear'} Template</CardTitle>
            <CardDescription>
              Define el nombre, descripción, prompt del sistema y base de conocimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Asistente de Ventas"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="knowledgeBaseName">Base de Conocimiento</Label>
                  <Input
                    id="knowledgeBaseName"
                    value={formData.knowledgeBaseName}
                    onChange={(e) => setFormData({ ...formData, knowledgeBaseName: e.target.value })}
                    placeholder="Nombre de la base de conocimiento"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el propósito de este agente..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">Prompt del Sistema *</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="Eres un asistente virtual especializado en..."
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="knowledgeBaseId">ID de Base de Conocimiento</Label>
                <Input
                  id="knowledgeBaseId"
                  value={formData.knowledgeBaseId}
                  onChange={(e) => setFormData({ ...formData, knowledgeBaseId: e.target.value })}
                  placeholder="ID de la base de conocimiento en n8n"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Guardando...' : 'Guardar Template'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Templates */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No tienes templates creados aún
            </p>
            <Button 
              onClick={() => setShowForm(true)} 
              className="gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800"
            >
              <Plus className="h-4 w-4" />
              Crear tu primer template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  {template.isActive && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Prompt:</span>
                    <p className="text-muted-foreground line-clamp-3 mt-1">
                      {template.systemPrompt}
                    </p>
                  </div>
                  
                  {template.knowledgeBaseName && (
                    <div>
                      <span className="font-semibold">Base de Conocimiento:</span>
                      <p className="text-muted-foreground">{template.knowledgeBaseName}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Usos: {template.usageCount}</span>
                    <span>•</span>
                    <span>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                    {isAdmin && template.username && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          👤 {template.username}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleLink(template)}
                    className="flex-1 gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Vincular
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        className="gap-1"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(template)}
                        className="gap-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template)}
                        className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Vinculación */}
      <TemplateLinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSelectPlatform={handlePlatformSelect}
      />

      {/* Modal de Telegram */}
      {showTelegramModal && templateForAgent && (
        <TelegramAgentModal
          isOpen={showTelegramModal}
          onClose={handleCloseAgentModal}
          onBack={() => {
            setShowTelegramModal(false);
            setShowLinkModal(true);
          }}
          fromTemplate={true}
          initialAgent={{
            name: templateForAgent.name,
            description: templateForAgent.description,
            systemPrompt: templateForAgent.systemPrompt,
          }}
        />
      )}

      {/* Modal de WhatsApp */}
      {showWhatsAppModal && templateForAgent && (
        <WhatsAppAgentModal
          isOpen={showWhatsAppModal}
          onClose={handleCloseAgentModal}
          onBack={() => {
            setShowWhatsAppModal(false);
            setShowLinkModal(true);
          }}
          fromTemplate={true}
          agent={{
            id: '',
            platform: 'whatsapp',
            name: templateForAgent.name,
            description: templateForAgent.description || '',
            status: 'inactive',
            prompt: templateForAgent.systemPrompt,
            workflowId: '',
            totalExecutions: 0,
            settings: {
              apiKeys: {},
              prompts: {},
              variables: {},
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
        />
      )}

      {/* Modal de Eliminación */}
      <DeleteTemplateDialog
        template={templateToDelete}
        isOpen={!!templateToDelete}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default AgentTemplates;
