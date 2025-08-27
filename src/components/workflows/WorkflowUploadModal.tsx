import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/store/workflowStore';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Workflow } from '@/types/workflow';

interface WorkflowUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadMethod = 'file' | 'json';
type UploadStep = 'method-selection' | 'file-upload' | 'json-input' | 'uploading' | 'success' | 'error';

export function WorkflowUploadModal({ isOpen, onClose }: WorkflowUploadModalProps) {
  const { toast } = useToast();
  const { uploadWorkflowFile, createWorkflow, loading } = useWorkflowStore();
  
  const [currentStep, setCurrentStep] = useState<UploadStep>('method-selection');
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedWorkflow, setUploadedWorkflow] = useState<Workflow | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    workflowJson: '',
    activate: false,
  });

  // Reset modal state when opening
  const resetModal = useCallback(() => {
    setCurrentStep('method-selection');
    setUploadMethod('file');
    setSelectedFile(null);
    setDragActive(false);
    setUploadedWorkflow(null);
    setFormData({
      name: '',
      description: '',
      workflowJson: '',
      activate: false,
    });
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Handle method selection
  const handleMethodSelect = (method: UploadMethod) => {
    setUploadMethod(method);
    setCurrentStep(method === 'file' ? 'file-upload' : 'json-input');
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          name: file.name.replace('.json', '')
        }));
      } else {
        toast({
          title: 'Archivo inválido',
          description: 'Solo se permiten archivos JSON',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          name: file.name.replace('.json', '')
        }));
      } else {
        toast({
          title: 'Archivo inválido',
          description: 'Solo se permiten archivos JSON',
          variant: 'destructive',
        });
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un nombre para el workflow',
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('uploading');

    try {
      const workflow = await uploadWorkflowFile(
        selectedFile,
        formData.name.trim(),
        formData.description.trim() || undefined
      );

      setUploadedWorkflow(workflow);
      setCurrentStep('success');

      toast({
        title: 'Workflow subido',
        description: `El workflow "${workflow.name}" se ha subido exitosamente`,
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error: unknown) {
      console.error('Error uploading workflow:', error);
      setCurrentStep('error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir el workflow',
        variant: 'destructive',
      });
    }
  };

  // Handle JSON submit
  const handleJsonSubmit = async () => {
    if (!formData.name.trim() || !formData.workflowJson.trim()) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    // Validate JSON
    try {
      JSON.parse(formData.workflowJson);
    } catch (error) {
      toast({
        title: 'JSON inválido',
        description: 'El JSON del workflow no es válido',
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('uploading');

    try {
      const workflow = await createWorkflow({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        workflowJson: formData.workflowJson.trim(),
        activate: formData.activate,
      });

      setUploadedWorkflow(workflow);
      setCurrentStep('success');

      toast({
        title: 'Workflow creado',
        description: `El workflow "${workflow.name}" se ha creado exitosamente`,
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error: unknown) {
      console.error('Error creating workflow:', error);
      setCurrentStep('error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear el workflow',
        variant: 'destructive',
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'method-selection':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">¿Cómo quieres subir tu workflow?</h3>
              <p className="text-muted-foreground">
                Elige el método que prefieras para agregar tu workflow de n8n
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleMethodSelect('file')}
              >
                <CardContent className="p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">Subir Archivo</h4>
                  <p className="text-sm text-muted-foreground">
                    Sube un archivo JSON exportado desde n8n
                  </p>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleMethodSelect('json')}
              >
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h4 className="font-semibold mb-2">Pegar JSON</h4>
                  <p className="text-sm text-muted-foreground">
                    Pega directamente el JSON del workflow
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'file-upload':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Subir Archivo de Workflow</h3>
              <p className="text-muted-foreground">
                Arrastra y suelta tu archivo JSON o haz clic para seleccionar
              </p>
            </div>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFormData(prev => ({ ...prev, name: '' }));
                    }}
                  >
                    Cambiar archivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">
                      Arrastra tu archivo JSON aquí
                    </p>
                    <p className="text-muted-foreground">o</p>
                  </div>
                  <Button asChild>
                    <label>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      Seleccionar archivo
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {/* Form Fields */}
            {selectedFile && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflow-name">
                    Nombre del Workflow <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="workflow-name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ej: Mi Workflow de WhatsApp"
                  />
                </div>
                
                <div>
                  <Label htmlFor="workflow-description">Descripción</Label>
                  <Textarea
                    id="workflow-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe qué hace este workflow..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'json-input':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pegar JSON del Workflow</h3>
              <p className="text-muted-foreground">
                Copia y pega el JSON exportado desde n8n
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="workflow-name">
                  Nombre del Workflow <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="workflow-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Mi Workflow de Telegram"
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-description">Descripción</Label>
                <Textarea
                  id="workflow-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe qué hace este workflow..."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-json">
                  JSON del Workflow <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="workflow-json"
                  value={formData.workflowJson}
                  onChange={(e) => handleInputChange('workflowJson', e.target.value)}
                  placeholder='{"name": "Mi Workflow", "nodes": [...], "connections": {...}}'
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="activate-workflow"
                  checked={formData.activate}
                  onCheckedChange={(checked) => handleInputChange('activate', checked)}
                />
                <Label htmlFor="activate-workflow">
                  Activar workflow después de crearlo
                </Label>
              </div>
            </div>
          </div>
        );

      case 'uploading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-lg font-semibold mb-2">Subiendo Workflow</h3>
            <p className="text-muted-foreground">
              Por favor espera mientras procesamos tu workflow...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">¡Workflow Subido!</h3>
            <p className="text-muted-foreground mb-4">
              El workflow "{uploadedWorkflow?.name}" se ha subido exitosamente
            </p>
            <div className="text-sm text-muted-foreground">
              <p>Nodos: {uploadedWorkflow?.nodeCount || 0}</p>
              <p>Estado: {uploadedWorkflow?.active ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error al Subir</h3>
            <p className="text-muted-foreground mb-4">
              Hubo un problema al subir el workflow. Por favor inténtalo de nuevo.
            </p>
            <Button onClick={() => setCurrentStep('method-selection')}>
              Intentar de nuevo
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    switch (currentStep) {
      case 'file-upload':
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep('method-selection')}>
              Atrás
            </Button>
            <Button 
              onClick={handleFileUpload}
              disabled={!selectedFile || !formData.name.trim() || loading}
            >
              Subir Workflow
            </Button>
          </div>
        );

      case 'json-input':
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep('method-selection')}>
              Atrás
            </Button>
            <Button 
              onClick={handleJsonSubmit}
              disabled={!formData.name.trim() || !formData.workflowJson.trim() || loading}
            >
              Crear Workflow
            </Button>
          </div>
        );

      case 'uploading':
      case 'success':
        return null;

      case 'error':
        return (
          <div className="flex justify-center">
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir Workflow de n8n</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {renderStepContent()}
        </div>
        
        {renderFooter() && (
          <div className="pt-4 border-t">
            {renderFooter()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
