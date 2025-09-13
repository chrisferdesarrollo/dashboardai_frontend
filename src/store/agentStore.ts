import { create } from 'zustand';
import { Agent, CreateAgentInput, UpdateAgentInput, AgentExecution } from '@/types/agent';
import { agentService, mapAgentResponseToAgent, CreateAgentRequest } from '@/services/agentApi';
import { whatsappApi } from '@/services/whatsappApi';

interface AgentStore {
  // Estado
  agents: Agent[];
  selectedAgent: Agent | null;
  executions: AgentExecution[];
  loading: boolean;
  error: string | null;
  
  // Filtros y búsqueda
  searchTerm: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Acciones
  setAgents: (agents: Agent[]) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void;

  // Operaciones asíncronas
  fetchAgents: () => Promise<void>;
  createAgent: (input: CreateAgentRequest) => Promise<Agent>;
  updateAgent: (input: UpdateAgentInput) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  toggleAgentStatus: (id: string) => Promise<void>;
  updateAgentStatus: (id: string, status: 'active' | 'inactive' | 'error') => Promise<void>;
  executeAgent: (id: string, input?: unknown) => Promise<void>;
  fetchExecutions: (agentId?: string) => Promise<void>;

  // Getters computados
  getFilteredAgents: () => Agent[];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Estado inicial
  agents: [],
  selectedAgent: null,
  executions: [],
  loading: false,
  error: null,
  searchTerm: '',
  statusFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',

  // Setters básicos
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  // Operaciones asíncronas
  fetchAgents: async () => {
    console.log('🔄 Iniciando fetchAgents...');
    set({ loading: true, error: null });
    try {
      console.log('📡 Llamando a agentService.getAgents()...');
      const response = await agentService.getAgents();
      console.log('📥 Respuesta completa recibida:', response);
      
      if (response.success && (response.data || response.agents)) {
        console.log('📊 Datos de agentes recibidos:', response.data || response.agents);
        const agentsData = response.data || response.agents;
        const mappedAgents = agentsData.map(mapAgentResponseToAgent);
        console.log('🔄 Agentes mapeados:', mappedAgents);
        set({ agents: mappedAgents, loading: false });
        console.log('✅ Agentes cargados exitosamente');
      } else {
        console.log('❌ Respuesta sin éxito o sin datos:', response);
        set({ error: response.error || 'Error al cargar agentes', loading: false });
      }
    } catch (error) {
      console.error('❌ Error en fetchAgents:', error);
      set({ error: 'Error al cargar agentes', loading: false });
    }
  },

  createAgent: async (input) => {
    set({ loading: true, error: null });
    try {
      const response = await agentService.createAgent(input);
      if (response.success && response.data) {
        const mappedAgent = mapAgentResponseToAgent(response.data);
        const agents = [...get().agents, mappedAgent];
        set({ agents, loading: false });
        return mappedAgent; // Devolver el agente creado
      } else {
        const errorMessage = response.error || 'Error al crear agente';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage); // Lanzar error para que el modal lo capture
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear agente';
      set({ error: errorMessage, loading: false });
      console.error('Error creating agent:', error);
      throw error; // Re-lanzar el error
    }
  },

  updateAgent: async (input) => {
    set({ loading: true, error: null });
    try {
      const agents = get().agents.map(agent => 
        agent.id === input.id 
          ? { ...agent, ...input, updatedAt: new Date() }
          : agent
      );
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al actualizar agente', loading: false });
      console.error('Error updating agent:', error);
    }
  },

  deleteAgent: async (id) => {
    console.log('🗑️ Iniciando eliminación del agente:', id);
    set({ loading: true, error: null });
    try {
      console.log('📡 Llamando a agentService.deleteAgent()...');
      await agentService.deleteAgent(id); // Usar el UUID string directamente
      console.log('✅ Agente eliminado del backend');
      
      // Remover el agente del estado local
      const agents = get().agents.filter(agent => agent.id !== id);
      set({ agents, loading: false });
      console.log('✅ Agente removido del estado local');
      
      // Si el agente eliminado era el seleccionado, limpiarlo
      if (get().selectedAgent?.id === id) {
        set({ selectedAgent: null });
        console.log('✅ Agente seleccionado limpiado');
      }
    } catch (error) {
      console.error('❌ Error eliminando agente:', error);
      set({ error: 'Error al eliminar agente', loading: false });
    }
  },

  toggleAgentStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      const agent = get().agents.find(a => a.id === id);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }
      
      const newStatus = agent.status === 'active' ? 'inactive' : 'active';
      
      // Llamar a la API para actualizar el estado en la base de datos
      await agentService.updateAgentStatus(id, newStatus);
      
      // Actualizar el estado local después de la llamada exitosa a la API
      const agents = get().agents.map(a => 
        a.id === id 
          ? { 
              ...a, 
              status: newStatus as 'active' | 'inactive',
              updatedAt: new Date()
            }
          : a
      );
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al cambiar estado del agente', loading: false });
      console.error('Error toggling agent status:', error);
    }
  },

  updateAgentStatus: async (id, status) => {
    console.log(`🔄 Actualizando estado del agente ${id} a: ${status}`);
    set({ loading: true, error: null });
    try {
      const agent = get().agents.find(a => a.id === id);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }
      
      // Llamar a la API para actualizar el estado en la base de datos
      await agentService.updateAgentStatus(id, status);
      
      // Actualizar el estado local después de la llamada exitosa a la API
      const agents = get().agents.map(a => 
        a.id === id 
          ? { 
              ...a, 
              status: status,
              updatedAt: new Date()
            }
          : a
      );
      set({ agents, loading: false });
      
      console.log(`✅ Estado del agente ${id} actualizado localmente a: ${status}`);
    } catch (error) {
      set({ error: 'Error al actualizar estado del agente', loading: false });
      console.error('❌ Error updating agent status:', error);
      throw error; // Re-lanzar el error para que el componente lo pueda manejar
    }
  },

  executeAgent: async (id, input) => {
    set({ loading: true, error: null });
    try {
      // Simular ejecución
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar contador de ejecuciones
      const agents = get().agents.map(agent => 
        agent.id === id 
          ? { 
              ...agent, 
              lastExecution: new Date(),
              totalExecutions: agent.totalExecutions + 1,
              updatedAt: new Date()
            }
          : agent
      );
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al ejecutar agente', loading: false });
      console.error('Error executing agent:', error);
    }
  },

  fetchExecutions: async (agentId) => {
    set({ loading: true, error: null });
    try {
      // En desarrollo, datos mock
      await new Promise(resolve => setTimeout(resolve, 500));
      const executions: AgentExecution[] = []; // Mock data si necesario
      set({ executions, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar ejecuciones', loading: false });
      console.error('Error fetching executions:', error);
    }
  },

  // Getter computado para agentes filtrados
  getFilteredAgents: () => {
    const { agents, searchTerm, statusFilter, sortBy, sortOrder } = get();
    
    const filtered = agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Agent] as string | number | Date;
      let bValue = b[sortBy as keyof Agent] as string | number | Date;
      
      if (sortBy === 'lastExecution') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  },
}));