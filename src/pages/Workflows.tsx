import { useEffect, useState } from 'react';
import { Search, Filter, Plus, RefreshCw, Upload, Play, Pause, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkflowUploadModal } from '@/components/workflows/WorkflowUploadModal';
import { useWorkflowStore } from '@/store/workflowStore';
import { Workflow } from '@/types/workflow';

export default function Workflows() {
  const { toast } = useToast();
  const {
    getFilteredWorkflows,
    getWorkflowStats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    loading,
    fetchWorkflows,
    activateWorkflow,
    deactivateWorkflow,
    deleteWorkflow,
    error,
  } = useWorkflowStore();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  const workflows = getFilteredWorkflows();
  const stats = getWorkflowStats();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleActivateWorkflow = async (workflow: Workflow) => {
    try {
      await activateWorkflow(workflow.id);
      toast({
        title: 'Workflow activado',
        description: `El workflow "${workflow.name}" ha sido activado.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo activar el workflow. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivateWorkflow = async (workflow: Workflow) => {
    try {
      await deactivateWorkflow(workflow.id);
      toast({
        title: 'Workflow desactivado',
        description: `El workflow "${workflow.name}" ha sido desactivado.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el workflow. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    try {
      await deleteWorkflow(workflow.id);
      toast({
        title: 'Workflow eliminado',
        description: `El workflow "${workflow.name}" ha sido eliminado.`,
      });
      setWorkflowToDelete(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el workflow. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadWorkflow = (workflow: Workflow) => {
    if (!workflow.workflowJson) {
      toast({
        title: 'Error',
        description: 'No se puede descargar este workflow.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const blob = new Blob([workflow.workflowJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Workflow descargado',
        description: `El workflow "${workflow.name}" se ha descargado.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el workflow.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows de n8n</h1>
          <p className="text-muted-foreground">
            Gestiona y monitorea tus workflows de automatización
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWorkflows}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Subir Workflow</span>
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <Pause className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de workflows */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-destructive mb-4">
            <AlertCircle className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">Error al cargar workflows</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchWorkflows}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <Search className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No se encontraron workflows</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Ajusta los filtros para ver más resultados' 
              : 'Sube tu primer workflow para empezar'}
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Subir Workflow
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg line-clamp-1">{workflow.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {workflow.description || 'Sin descripción'}
                    </CardDescription>
                  </div>
                  <Badge variant={workflow.active ? 'default' : 'secondary'}>
                    {workflow.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Nodos:</span>
                    <span className="font-medium">{workflow.nodeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Creado:</span>
                    <span className="font-medium">{formatDate(workflow.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actualizado:</span>
                    <span className="font-medium">{formatDate(workflow.updatedAt)}</span>
                  </div>
                  {workflow.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workflow.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <div className="flex space-x-1">
                  {workflow.active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateWorkflow(workflow)}
                      disabled={loading}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateWorkflow(workflow)}
                      disabled={loading}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadWorkflow(workflow)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setWorkflowToDelete(workflow)}
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de subida */}
      <WorkflowUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Confirmación de eliminación */}
      {workflowToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Eliminar Workflow</CardTitle>
              <CardDescription>
                ¿Estás seguro de que quieres eliminar el workflow "{workflowToDelete.name}"?
                Esta acción no se puede deshacer.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setWorkflowToDelete(null)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteWorkflow(workflowToDelete)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
