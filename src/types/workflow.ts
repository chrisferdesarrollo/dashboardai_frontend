export interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodeCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  workflowJson?: string;
}

export interface WorkflowUploadData {
  name: string;
  description?: string;
  workflowJson: string;
  activate?: boolean;
}

export interface WorkflowStats {
  total: number;
  active: number;
  inactive: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}
