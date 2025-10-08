export interface Document {
  id: string;
  name: string;
  description?: string;
  fileType: string;
  tags?: string[];
  agentId?: string;
  uploadDate: string;
  processed: boolean;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUpload {
  file: File;
  name: string;
  description?: string;
  tags?: string[];
  agentId?: string;
}

export interface DocumentStats {
  total: number;
  processed: number;
  pending: number;
  failed: number;
  successRate: number;
}

export interface DocumentFilter {
  search?: string;
  tags?: string[];
  agentId?: string;
  processingStatus?: string;
  fileType?: string;
}

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/csv'
];

export const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv'];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const PROCESSING_STATUS_LABELS = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido'
};

export const PROCESSING_STATUS_COLORS = {
  PENDING: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  PROCESSING: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  COMPLETED: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  FAILED: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
};