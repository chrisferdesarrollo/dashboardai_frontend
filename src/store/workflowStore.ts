import { create } from 'zustand';
import { Workflow, WorkflowUploadData, WorkflowStats } from '@/types/workflow';
import { workflowService, WorkflowResponse } from '@/services/workflowService';

interface WorkflowStore {
  // Estado
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  loading: boolean;
  error: string | null;
  
  // Filtros y búsqueda
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Acciones
  setWorkflows: (workflows: Workflow[]) => void;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void;
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void;

  // Operaciones asíncronas
  fetchWorkflows: () => Promise<void>;
  uploadWorkflowFile: (file: File, name?: string, description?: string) => Promise<Workflow>;
  createWorkflow: (data: WorkflowUploadData) => Promise<Workflow>;
  activateWorkflow: (id: string) => Promise<void>;
  deactivateWorkflow: (id: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;

  // Getters computados
  getFilteredWorkflows: () => Workflow[];
  getWorkflowStats: () => WorkflowStats;
}

// Función helper para mapear respuesta del API a Workflow
const mapWorkflowResponseToWorkflow = (response: WorkflowResponse): Workflow => {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    active: response.active,
    nodeCount: parseInt(response.nodeCount) || 0,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    tags: response.tags ? response.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    workflowJson: response.workflowJson,
  };
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Estado inicial
  workflows: [],
  selectedWorkflow: null,
  loading: false,
  error: null,
  searchTerm: '',
  statusFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',

  // Setters básicos
  setWorkflows: (workflows) => set({ workflows }),
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

  // Operaciones asíncronas
  fetchWorkflows: async () => {
    console.log('🔄 Iniciando fetchWorkflows...');
    set({ loading: true, error: null });
    try {
      console.log('📡 Llamando a workflowService.getWorkflows()...');
      const response = await workflowService.getWorkflows();
      console.log('📥 Respuesta completa recibida:', response);
      
      if (response.success && response.data) {
        console.log('📊 Datos de workflows recibidos:', response.data);
        const mappedWorkflows = response.data.map(mapWorkflowResponseToWorkflow);
        console.log('🔄 Workflows mapeados:', mappedWorkflows);
        set({ workflows: mappedWorkflows, loading: false });
        console.log('✅ Workflows cargados exitosamente');
      } else {
        console.log('❌ Respuesta sin éxito o sin datos:', response);
        set({ error: response.error || 'Error al cargar workflows', loading: false });
      }
    } catch (error) {
      console.error('❌ Error en fetchWorkflows:', error);
      set({ error: 'Error al cargar workflows', loading: false });
    }
  },

  uploadWorkflowFile: async (file: File, name?: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await workflowService.uploadWorkflowFile(file, name, description);
      if (response.success && response.data) {
        const mappedWorkflow = mapWorkflowResponseToWorkflow(response.data);
        const workflows = [...get().workflows, mappedWorkflow];
        set({ workflows, loading: false });
        return mappedWorkflow;
      } else {
        const errorMessage = response.error || 'Error al subir workflow';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al subir workflow';
      set({ error: errorMessage, loading: false });
      console.error('Error uploading workflow file:', error);
      throw error;
    }
  },

  createWorkflow: async (data: WorkflowUploadData) => {
    set({ loading: true, error: null });
    try {
      const response = await workflowService.createWorkflow(data);
      if (response.success && response.data) {
        const mappedWorkflow = mapWorkflowResponseToWorkflow(response.data);
        const workflows = [...get().workflows, mappedWorkflow];
        set({ workflows, loading: false });
        return mappedWorkflow;
      } else {
        const errorMessage = response.error || 'Error al crear workflow';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear workflow';
      set({ error: errorMessage, loading: false });
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  activateWorkflow: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await workflowService.activateWorkflow(id);
      if (response.success && response.data) {
        const updatedWorkflow = mapWorkflowResponseToWorkflow(response.data);
        const workflows = get().workflows.map(workflow => 
          workflow.id === id ? updatedWorkflow : workflow
        );
        set({ workflows, loading: false });
      } else {
        const errorMessage = response.error || 'Error al activar workflow';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al activar workflow';
      set({ error: errorMessage, loading: false });
      console.error('Error activating workflow:', error);
      throw error;
    }
  },

  deactivateWorkflow: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await workflowService.deactivateWorkflow(id);
      if (response.success && response.data) {
        const updatedWorkflow = mapWorkflowResponseToWorkflow(response.data);
        const workflows = get().workflows.map(workflow => 
          workflow.id === id ? updatedWorkflow : workflow
        );
        set({ workflows, loading: false });
      } else {
        const errorMessage = response.error || 'Error al desactivar workflow';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al desactivar workflow';
      set({ error: errorMessage, loading: false });
      console.error('Error deactivating workflow:', error);
      throw error;
    }
  },

  deleteWorkflow: async (id: string) => {
    console.log('🗑️ Iniciando eliminación del workflow:', id);
    set({ loading: true, error: null });
    try {
      console.log('📡 Llamando a workflowService.deleteWorkflow()...');
      const response = await workflowService.deleteWorkflow(id);
      
      if (response.success) {
        console.log('✅ Workflow eliminado del backend');
        
        // Remover el workflow del estado local
        const workflows = get().workflows.filter(workflow => workflow.id !== id);
        set({ workflows, loading: false });
        console.log('✅ Workflow removido del estado local');
        
        // Si el workflow eliminado era el seleccionado, limpiarlo
        if (get().selectedWorkflow?.id === id) {
          set({ selectedWorkflow: null });
          console.log('✅ Workflow seleccionado limpiado');
        }
      } else {
        const errorMessage = response.error || 'Error al eliminar workflow';
        set({ error: errorMessage, loading: false });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error eliminando workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar workflow';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Getters computados
  getFilteredWorkflows: () => {
    const { workflows, searchTerm, statusFilter, sortBy, sortOrder } = get();
    
    const filtered = workflows.filter(workflow => {
      const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && workflow.active) ||
                           (statusFilter === 'inactive' && !workflow.active);
      
      return matchesSearch && matchesStatus;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Workflow] as string | number | Date;
      let bValue = b[sortBy as keyof Workflow] as string | number | Date;
      
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
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

  getWorkflowStats: () => {
    const { workflows } = get();
    return {
      total: workflows.length,
      active: workflows.filter(w => w.active).length,
      inactive: workflows.filter(w => !w.active).length,
    };
  },
}));
