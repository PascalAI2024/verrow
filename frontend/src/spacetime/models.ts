export type SpacetimeId = string;

export type ISODateString = string;

export type LeadCategory = 'business' | 'personal' | 'unknown';

export type ProcessingStatus =
  | 'waiting'
  | 'queued'
  | 'pending'
  | 'processing'
  | 'mapped'
  | 'pending_mapping'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SpacetimePageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SpacetimeJob {
  id: SpacetimeId;
  status: ProcessingStatus;
  progress: number;
  step?: string;
  message?: string;
  fileId?: SpacetimeId;
  datasetId?: SpacetimeId;
  result?: unknown;
  error?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SpacetimeFile {
  id: SpacetimeId;
  name: string;
  originalName: string;
  size: number;
  status: ProcessingStatus;
  uploadDate: ISODateString;
  recordCount?: number;
  columnCount?: number;
  jobId?: SpacetimeId;
  datasetId?: SpacetimeId;
  qualityScore?: number;
  error?: string;
}

export interface SpacetimeRecord {
  id: SpacetimeId;
  fileId?: SpacetimeId;
  datasetId?: SpacetimeId;
  leadCategory?: LeadCategory;
  qualityScore?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [field: string]: unknown;
}

export type SpacetimeActivityStatus = 'success' | 'error' | 'info' | 'warning' | string;

export interface SpacetimeActivity {
  id: SpacetimeId;
  timestamp: ISODateString;
  action: string;
  entityType: string;
  entityId?: SpacetimeId;
  details?: Record<string, unknown>;
  userId?: SpacetimeId;
  status?: SpacetimeActivityStatus;
  duration?: number;
}

export interface SpacetimeCollectionResult<T> {
  data: T[];
  meta?: Partial<SpacetimePageMeta>;
}

export type SpacetimeTableName =
  | 'processing_jobs'
  | 'uploaded_files'
  | 'data_records'
  | 'activity_events'
  | string;

export interface SpacetimeLiveFilter {
  field: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface SpacetimeLiveQuery {
  table: SpacetimeTableName;
  filters?: SpacetimeLiveFilter[];
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface SpacetimeCollectionState<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  lastUpdatedAt: ISODateString | null;
}

export const SPACETIME_TABLES = {
  jobs: 'processing_jobs',
  files: 'uploaded_files',
  records: 'data_records',
  activity: 'activity_events',
} as const;
