import { create } from 'zustand';
import { Agent, CreateAgentInput, UpdateAgentInput, AgentExecution } from '@/types/agent';
import { mockData, n8nApi } from '@/services/n8nApi';

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
  createAgent: (input: CreateAgentInput) => Promise<void>;
  updateAgent: (input: UpdateAgentInput) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  toggleAgentStatus: (id: string) => Promise<void>;
  executeAgent: (id: string, input?: any) => Promise<void>;
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
    set({ loading: true, error: null });
    try {
      // En desarrollo, usar datos mock
      // En producción, usar: const workflows = await n8nApi.getWorkflows();
      await new Promise(resolve => setTimeout(resolve, 800)); // Simular carga
      const agents = mockData.agents;
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar agentes', loading: false });
      console.error('Error fetching agents:', error);
    }
  },

  createAgent: async (input) => {
    set({ loading: true, error: null });
    try {
      // Simular creación
      const newAgent: Agent = {
        id: Date.now().toString(),
        ...input,
        status: 'inactive',
        lastExecution: undefined,
        totalExecutions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const agents = [...get().agents, newAgent];
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al crear agente', loading: false });
      console.error('Error creating agent:', error);
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
    set({ loading: true, error: null });
    try {
      const agents = get().agents.filter(agent => agent.id !== id);
      set({ agents, loading: false });
      
      // Si el agente eliminado era el seleccionado, limpiarlo
      if (get().selectedAgent?.id === id) {
        set({ selectedAgent: null });
      }
    } catch (error) {
      set({ error: 'Error al eliminar agente', loading: false });
      console.error('Error deleting agent:', error);
    }
  },

  toggleAgentStatus: async (id) => {
    set({ loading: true, error: null });
    try {
      const agents = get().agents.map(agent => 
        agent.id === id 
          ? { 
              ...agent, 
              status: (agent.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
              updatedAt: new Date()
            }
          : agent
      );
      set({ agents, loading: false });
    } catch (error) {
      set({ error: 'Error al cambiar estado del agente', loading: false });
      console.error('Error toggling agent status:', error);
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
    
    let filtered = agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Agent];
      let bValue: any = b[sortBy as keyof Agent];
      
      if (sortBy === 'lastExecution') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      if (typeof aValue === 'string') {
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