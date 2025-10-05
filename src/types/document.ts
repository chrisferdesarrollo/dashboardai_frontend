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
  PENDING: 'text-yellow-600 bg-yellow-100',
  PROCESSING: 'text-blue-600 bg-blue-100',
  COMPLETED: 'text-green-600 bg-green-100',
  FAILED: 'text-red-600 bg-red-100'
};