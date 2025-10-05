import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { documentApi } from '@/services/documentApi';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    agentId: '',
    file: null as File | null,
  });

  const supportedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/csv'
  ];

  const maxSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!supportedTypes.includes(file.type)) {
      return 'Tipo de archivo no soportado. Formatos permitidos: PDF, Word, TXT, MD, CSV';
    }
    if (file.size > maxSize) {
      return 'El archivo excede el tamaño máximo de 10MB';
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''), // Quitar extensión si no hay nombre
    }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file) {
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
        description: 'Por favor ingresa un nombre para el documento',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const uploadRequest = {
        file: formData.file,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()) : undefined,
        agentId: formData.agentId.trim() || undefined,
      };

      await documentApi.uploadDocument(uploadRequest);
      
      toast({
        title: 'Éxito',
        description: 'Documento subido correctamente y enviado para procesamiento',
      });

      // Resetear form
      setFormData({
        name: '',
        description: '',
        tags: '',
        agentId: '',
        file: null,
      });

      onSuccess();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir el documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({
      name: '',
      description: '',
      tags: '',
      agentId: '',
      file: null,
    });
    setDragActive(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Sube un documento para convertirlo en conocimiento vectorizado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : formData.file
                ? 'border-green-500 bg-green-50'
                : 'border-muted-foreground/25 hover:border-primary'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md,.csv"
              onChange={handleFileInputChange}
            />

            {formData.file ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-8 w-8 text-green-500" />
                <p className="text-sm font-medium">{formData.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-sm">
                  <span className="font-medium">Arrastra y suelta</span> tu archivo aquí, o{' '}
                  <span className="text-primary">busca</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, TXT, MD, CSV (máx. 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del documento *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ingresa un nombre descriptivo"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe el contenido del documento..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
            <p className="text-xs text-muted-foreground">Separa los tags con comas</p>
          </div>

          {/* Agent ID */}
          <div className="space-y-2">
            <Label htmlFor="agentId">ID del Agente (opcional)</Label>
            <Input
              id="agentId"
              value={formData.agentId}
              onChange={(e) => setFormData(prev => ({ ...prev, agentId: e.target.value }))}
              placeholder="ID del agente para entrenar"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              className="flex-1"
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={uploading || !formData.file || !formData.name.trim()}
            >
              {uploading ? 'Subiendo...' : 'Subir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};