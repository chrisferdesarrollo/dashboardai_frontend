import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Tag,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { documentApi, DocumentResponse } from '@/services/documentApi';
import { 
  Document, 
  DocumentUpload, 
  DocumentStats, 
  SUPPORTED_FILE_TYPES, 
  MAX_FILE_SIZE,
  PROCESSING_STATUS_LABELS,
  PROCESSING_STATUS_COLORS
} from '@/types/document';

const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state para subida de documentos
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    tags: '',
    agentId: '',
    file: null as File | null
  });

  // Cargar documentos y estadísticas
  const loadDocuments = useCallback(async (page: number = 0) => {
    setLoading(true);
    try {
      const response = await documentApi.getAllDocuments(page, 20);
      setDocuments(response.content);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await documentApi.getDocumentStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  // Configuración del drag and drop manual
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      
      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Error',
          description: 'El archivo excede el tamaño máximo permitido (10MB)',
          variant: 'destructive',
        });
        return;
      }

      // Validar tipo
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv'];
      if (!extension || !allowedExtensions.includes(extension)) {
        toast({
          title: 'Error',
          description: 'Tipo de archivo no permitido. Formatos soportados: PDF, Word, TXT, MD, CSV',
          variant: 'destructive',
        });
        return;
      }

      setUploadForm(prev => ({
        ...prev,
        file,
        name: file.name.split('.')[0] // Nombre sin extensión como nombre por defecto
      }));
      setUploadDialogOpen(true);
    }
  }, [toast]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Error',
          description: 'El archivo excede el tamaño máximo permitido (10MB)',
          variant: 'destructive',
        });
        return;
      }

      // Validar tipo
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv'];
      if (!extension || !allowedExtensions.includes(extension)) {
        toast({
          title: 'Error',
          description: 'Tipo de archivo no permitido. Formatos soportados: PDF, Word, TXT, MD, CSV',
          variant: 'destructive',
        });
        return;
      }

      setUploadForm(prev => ({
        ...prev,
        file,
        name: file.name.split('.')[0] // Nombre sin extensión como nombre por defecto
      }));
      setUploadDialogOpen(true);
    }
  };

  // Manejar subida de documento
  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un archivo y proporcionar un nombre',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const tags = uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await documentApi.uploadDocument({
        file: uploadForm.file,
        name: uploadForm.name.trim(),
        description: uploadForm.description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        agentId: uploadForm.agentId || undefined,
      });

      toast({
        title: 'Éxito',
        description: 'Documento subido exitosamente',
      });

      // Resetear formulario y cerrar dialog
      setUploadForm({
        name: '',
        description: '',
        tags: '',
        agentId: '',
        file: null
      });
      setUploadDialogOpen(false);

      // Recargar documentos y estadísticas
      loadDocuments(currentPage);
      loadStats();

    } catch (error: unknown) {
      console.error('Error subiendo documento:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response && 
        'data' in error.response && typeof error.response.data === 'object' && 
        error.response.data && 'message' in error.response.data 
        ? String(error.response.data.message) 
        : 'Error al subir el documento';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Manejar eliminación de documento
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      return;
    }

    try {
      await documentApi.deleteDocument(id);
      toast({
        title: 'Éxito',
        description: 'Documento eliminado exitosamente',
      });
      loadDocuments(currentPage);
      loadStats();
    } catch (error: unknown) {
      console.error('Error eliminando documento:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response && 
        'data' in error.response && typeof error.response.data === 'object' && 
        error.response.data && 'message' in error.response.data 
        ? String(error.response.data.message) 
        : 'Error al eliminar el documento';
        
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Buscar documentos
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadDocuments();
      return;
    }

    setLoading(true);
    try {
      const results = await documentApi.searchDocuments(searchTerm);
      setDocuments(results);
      setTotalPages(1);
    } catch (error) {
      console.error('Error buscando documentos:', error);
      toast({
        title: 'Error',
        description: 'Error al buscar documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Obtener icono de estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Base de Conocimientos</h1>
            <p className="text-muted-foreground">
              Gestiona documentos y entrena tus agentes de IA con conocimiento vectorizado
            </p>
          </div>
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Subir Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Documento</DialogTitle>
              <DialogDescription>
                Sube documentos para vectorizar y entrenar tus agentes de IA
              </DialogDescription>
            </DialogHeader>
            
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.txt,.md,.csv"
                className="hidden"
              />
              <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              {uploadForm.file ? (
                <div>
                  <p className="font-medium">{uploadForm.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadForm.file.size)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-2">Arrastra y suelta un archivo aquí, o haz clic para seleccionar</p>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: PDF, Word, TXT, MD, CSV (máx. 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del documento</Label>
                <Input
                  id="name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre descriptivo del documento"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción detallada del contenido"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (opcional)</Label>
                <Input
                  id="tags"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separar múltiples tags con comas
                </p>
              </div>

              <div>
                <Label htmlFor="agentId">ID del Agente (opcional)</Label>
                <Input
                  id="agentId"
                  value={uploadForm.agentId}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, agentId: e.target.value }))}
                  placeholder="ID del agente específico para entrenar"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setUploadDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.file || !uploadForm.name.trim()}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  'Subir Documento'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procesados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Lista de documentos */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay documentos</p>
              <p className="text-muted-foreground">Sube tu primer documento para comenzar</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{doc.name}</h3>
                      <Badge 
                        variant="secondary" 
                        className={`${PROCESSING_STATUS_COLORS[doc.processingStatus as keyof typeof PROCESSING_STATUS_COLORS]} gap-1`}
                      >
                        {getStatusIcon(doc.processingStatus)}
                        {PROCESSING_STATUS_LABELS[doc.processingStatus as keyof typeof PROCESSING_STATUS_LABELS]}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {doc.originalFilename} • {formatFileSize(doc.fileSize)}
                    </p>
                    
                    {doc.description && (
                      <p className="text-sm mb-3">{doc.description}</p>
                    )}
                    
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {doc.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Subido el {new Date(doc.uploadDate).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadDocuments(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {currentPage + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => loadDocuments(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;