export interface MappingSuggestion {
  sourceColumn: string;
  targetColumn: string | null;
  confidence: number;
}

export interface Mapping {
  sourceColumn: string;
  targetColumn: string;
}

export interface DataRecord {
  id: string;
  business_name?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  additional_emails?: string;
  additional_phones?: string;
  website?: string;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
  founded_year?: number;
  description?: string;
  contact_name?: string;
  contact_title?: string;
  additional_data?: Record<string, any>;
  source_file?: string;
  batch_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobStatus {
  jobId: string;
  status: string;
  progress: number;
}

export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  headers?: string[];
  recordCount?: number;
  tags?: string[];
  category?: string;
  qualityScore?: number;
  uploadedAt: Date;
}

export interface DataSet {
  id: string;
  name: string;
  description?: string;
  files: FileUpload[];
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
  totalRecords: number;
  relationships?: DataRelationship[];
}

export interface DataRelationship {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  sourceColumn: string;
  targetColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  confidence: number;
}

export interface SchemaPattern {
  id: string;
  name: string;
  description: string;
  columns: SchemaColumn[];
  tags: string[];
  usageCount: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  required: boolean;
  patterns?: string[];
  commonNames?: string[];
}

export interface DataQualityReport {
  fileId: string;
  overallScore: number;
  issues: QualityIssue[];
  duplicates: DuplicateRecord[];
  anomalies: DataAnomaly[];
  suggestions: string[];
}

export interface QualityIssue {
  column: string;
  issueType: 'missing_values' | 'inconsistent_format' | 'outliers' | 'invalid_data';
  severity: 'low' | 'medium' | 'high';
  affectedRows: number;
  examples: any[];
}

export interface DuplicateRecord {
  primaryId: string;
  duplicateIds: string[];
  matchColumns: string[];
  confidence: number;
}

export interface DataAnomaly {
  column: string;
  value: any;
  rowId: string;
  anomalyType: string;
  confidence: number;
}
