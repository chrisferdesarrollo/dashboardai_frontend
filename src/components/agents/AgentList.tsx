import { useState } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
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
import { AgentCard } from './AgentCard';
import { AgentCreationFlow } from './AgentCreationFlow';
import { DeleteAgentDialog } from './DeleteAgentDialog';
import { AgentDetailModal } from './AgentDetailModal';
import { useAgentStore } from '@/store/agentStore';
import { Agent } from '@/types/agent';

export function AgentList() {
  const { toast } = useToast();
  const {
    getFilteredAgents,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    loading,
    fetchAgents,
    deleteAgent,
    error,
  } = useAgentStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const agents = getFilteredAgents();

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleDeleteAgent = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (agent) {
      setAgentToDelete(agent);
    }
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteAgent(agentToDelete.id);
      toast({
        title: 'Agente eliminado',
        description: `El agente "${agentToDelete.name}" ha sido eliminado exitosamente.`,
      });
      setAgentToDelete(null);
    } catch (error) {
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el agente. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAgent = () => {
    setAgentToDelete(null);
    setIsDeleting(false);
  };

  const handleViewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agentes de IA</h1>
          <p className="text-muted-foreground">
            Gestiona y monitorea tus agentes conectados a n8n
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAgents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button onClick={handleCreateAgent} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nuevo Agente</span>
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar agentes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="error">Con errores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de agentes */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <Search className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No se encontraron agentes</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Ajusta los filtros para ver más resultados' 
              : 'Crea tu primer agente para empezar'}
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <Button onClick={handleCreateAgent}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Agente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEditAgent}
              onDelete={handleDeleteAgent}
              onView={handleViewAgent}
            />
          ))}
        </div>
      )}

      {/* Modal de creación/edición */}
      <AgentCreationFlow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agent={editingAgent}
      />

      {/* Dialog de confirmación de eliminación */}
      <DeleteAgentDialog
        agent={agentToDelete}
        isOpen={!!agentToDelete}
        onClose={cancelDeleteAgent}
        onConfirm={confirmDeleteAgent}
        isDeleting={isDeleting}
      />

      {/* Modal de detalles del agente */}
      <AgentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedAgent(null);
        }}
        agent={selectedAgent}
      />
    </div>
  );
}