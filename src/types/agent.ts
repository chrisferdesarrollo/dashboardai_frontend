// Tipos de datos para los agentes de IA
export type PlatformType = 'whatsapp' | 'telegram';

export interface WhatsAppPlatformConfig {
  sessionName: string;
  isConnected: boolean;
  connectedAt: string;
  timestamp: string;
  businessType?: string;
  conversationalGoal?: string;
  targetAudience?: string;
  businessInfo?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  platform: PlatformType; // Nueva propiedad para la plataforma
  status: 'active' | 'inactive' | 'error';
  prompt: string; // ✅ Agregado: Prompt del agente almacenado en BD
  sessionName?: string; // ✅ Agregado: Session name para WhatsApp
  workflowId: string; // ID del flujo en n8n
  lastExecution?: Date;
  totalExecutions: number;
  settings: AgentSettings;
  platformConfig?: string | WhatsAppPlatformConfig; // Configuración específica de la plataforma
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSettings {
  apiKeys: Record<string, string>;
  prompts: Record<string, string>;
  variables: Record<string, unknown>;
  webhookUrl?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  nodeId?: string;
}

export interface CreateAgentInput {
  name: string;
  description: string;
  platform: PlatformType; // Nueva propiedad para la plataforma
  workflowId: string;
  settings: AgentSettings;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
  status?: 'active' | 'inactive';
}