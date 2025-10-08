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
  AlertCircle,
  RefreshCw,
  Bot,
  MessageCircle,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { documentApi, DocumentResponse } from '@/services/documentApi';
import { agentService, AgentResponse } from '@/services/agentApi';
import { DeleteDocumentDialog } from '@/components/knowledge-base/DeleteDocumentDialog';
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
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('none');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state para subida de documentos
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    tags: '',
    selectedAgent: 'none',
    agentId: '',
    file: null as File | null
  });

  // Cargar documentos y estadísticas
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const documentsData = await documentApi.getAllDocuments();
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar los documentos';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
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

  // Cargar agentes disponibles
  const loadAgents = useCallback(async () => {
    try {
      if (!user?.id) {
        console.warn('No hay usuario autenticado para cargar agentes');
        return;
      }
      
      const response = await agentService.getAgentsByUser(user.id);
      if (response.success && response.data) {
        setAgents(response.data);
      } else if (response.agents) {
        setAgents(response.agents);
      }
    } catch (error) {
      console.error('Error cargando agentes:', error);
    }
  }, [user?.id]);

  // Función para refrescar todos los datos
  const refreshData = useCallback(async () => {
    await Promise.all([loadDocuments(), loadStats(), loadAgents()]);
  }, [loadDocuments, loadStats, loadAgents]);

  // Función para obtener el agente asociado a un documento
  const getAgentForDocument = useCallback((document: DocumentResponse): AgentResponse | null => {
    if (!document.agentId) return null;
    return agents.find(agent => agent.id === document.agentId) || null;
  }, [agents]);

  // Función para obtener el ícono y color de la plataforma
  const getPlatformInfo = useCallback((platform: 'whatsapp' | 'telegram') => {
    switch (platform) {
      case 'whatsapp':
        return {
          icon: <MessageCircle className="h-4 w-4 text-green-600" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          badgeColor: 'text-green-700 border-green-300',
          name: 'WhatsApp'
        };
      case 'telegram':
        return {
          icon: <Phone className="h-4 w-4 text-blue-600" />,
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50 border-blue-200',
          badgeColor: 'text-blue-700 border-blue-300',
          name: 'Telegram'
        };
      default:
        return {
          icon: <Bot className="h-4 w-4 text-gray-600" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          badgeColor: 'text-gray-700 border-gray-300',
          name: 'Bot'
        };
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  // Manejar selección de agente
  const handleAgentSelection = (agentId: string) => {
    setUploadForm(prev => ({
      ...prev,
      selectedAgent: agentId,
      agentId: agentId === 'none' ? '' : agentId
    }));
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
      
      // El agentId ya viene validado de la selección
      const validAgentId = uploadForm.agentId && uploadForm.agentId.trim() ? uploadForm.agentId.trim() : undefined;
      
      await documentApi.uploadDocument({
        file: uploadForm.file,
        name: uploadForm.name.trim(),
        description: uploadForm.description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        agentId: validAgentId,
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
        selectedAgent: 'none',
        agentId: '',
        file: null
      });
      setUploadDialogOpen(false);

      // Recargar documentos y estadísticas
      await refreshData();

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
  const handleDelete = (document: DocumentResponse) => {
    setDocumentToDelete(document);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      await documentApi.deleteDocument(documentToDelete.id);
      toast({
        title: 'Documento eliminado',
        description: `El documento "${documentToDelete.name}" ha sido eliminado exitosamente.`,
      });
      setDocumentToDelete(null);
      await refreshData();
    } catch (error: unknown) {
      console.error('Error eliminando documento:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response && 
        'data' in error.response && typeof error.response.data === 'object' && 
        error.response.data && 'message' in error.response.data 
        ? String(error.response.data.message) 
        : 'Error al eliminar el documento';
        
      toast({
        title: 'Error al eliminar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Buscar documentos
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadDocuments();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await documentApi.searchDocuments(searchTerm);
      setDocuments(results);
      setTotalPages(1);
    } catch (error) {
      console.error('Error buscando documentos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al buscar documentos';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
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

  // Función para obtener el agente asociado a un documento
  const getDocumentAgent = (doc: DocumentResponse) => {
    if (!doc.agentId) return null;
    return agents.find(agent => agent.id === doc.agentId) || null;
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
                <Label htmlFor="agentId">Agente (opcional)</Label>
                <Select
                  value={uploadForm.selectedAgent}
                  onValueChange={handleAgentSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un agente específico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin agente específico</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <Button onClick={refreshData} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Lista de documentos */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <FileText className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error al cargar documentos</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <FileText className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay documentos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'No se encontraron documentos que coincidan con tu búsqueda' 
              : 'Sube tu primer documento para comenzar a entrenar tus agentes de IA'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Subir Documento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const associatedAgent = getDocumentAgent(doc);
            return (
              <Card key={doc.id} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent border hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                        <CardTitle className="text-lg leading-none hover:text-primary cursor-pointer transition-colors line-clamp-1">
                          {doc.name}
                        </CardTitle>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Subido {new Date(doc.uploadDate).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={`${PROCESSING_STATUS_COLORS[doc.processingStatus as keyof typeof PROCESSING_STATUS_COLORS]} gap-1`}
                      >
                        {getStatusIcon(doc.processingStatus)}
                        {PROCESSING_STATUS_LABELS[doc.processingStatus as keyof typeof PROCESSING_STATUS_LABELS]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Información del agente asociado */}
                  {associatedAgent ? (
                    <div className={`flex items-center gap-2 p-2 rounded-md ${getPlatformInfo(associatedAgent.platform).bgColor}`}>
                      {getPlatformInfo(associatedAgent.platform).icon}
                      <span className="text-sm text-muted-foreground">Usado por agente:</span>
                      <span className="text-sm font-medium text-primary">{associatedAgent.name}</span>
                      <div className="ml-auto">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPlatformInfo(associatedAgent.platform).badgeColor}`}
                        >
                          {associatedAgent.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Disponible para todos los agentes</span>
                    </div>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.tags.length - 3} más
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(doc.uploadDate).toLocaleDateString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          onClick={() => handleDelete(doc)}
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
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {currentPage + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo de eliminación */}
      <DeleteDocumentDialog
        document={documentToDelete}
        agent={documentToDelete ? getAgentForDocument(documentToDelete) : null}
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={confirmDeleteDocument}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default KnowledgeBase;