import axios,{ AxiosProgressEvent,AxiosRequestConfig } from 'axios';

// Determine if we're in production mode
const isProduction = import.meta.env.MODE === 'production'

// The default open-source path is Rust + SpacetimeDB. A custom REST gateway can be enabled for local experiments.
const REST_GATEWAY_URL = import.meta.env.VITE_REST_GATEWAY_URL || ''
const RUST_INGEST_API_URL = import.meta.env.VITE_RUST_INGEST_API_URL || (isProduction ? '' : 'http://localhost:3010')
const restGatewayEnabled = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_ENABLE_REST_GATEWAY || '').toLowerCase(),
)

const requireRestGateway = (feature: string) => {
  if (!restGatewayEnabled) {
    throw new Error(`${feature} is available when the optional REST gateway is explicitly enabled.`)
  }
}

const rustIngestApi = axios.create({
  baseURL: RUST_INGEST_API_URL,
})

// Define a custom interface for Axios request configuration
export interface CustomRequestConfig extends AxiosRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}

// Export the api instance so it can be used directly
export const api = axios.create({
  baseURL: REST_GATEWAY_URL,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API call failed:', error); // Log the full error object

    let userMessage = 'An unexpected error occurred.';

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.status, error.response.data);
      userMessage = `Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
      if (error.response.status >= 500) {
        userMessage = 'A server error occurred. Please try again later.';
      } else if (error.response.status >= 400) {
        userMessage = `Request failed: ${error.response.data?.message || error.response.statusText}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      userMessage = 'No response received from server. Please check your network connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      userMessage = `Request failed: ${error.message}`;
    }

    // Attach user-friendly message to error for components to use
    error.userMessage = userMessage;

    return Promise.reject(error);
  }
);

export interface MappingSuggestion {
  sourceColumn: string
  targetColumn: string | null
  confidence: number
}

export interface Mapping {
  sourceColumn: string
  targetColumn: string
}

export interface JobStatus {
  id: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  step?: string;
  message?: string;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataRecord {
  id: string
  [key: string]: any
}

export interface DataQueryResult {
  data: DataRecord[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UploadFileResponse {
  jobId: string;
  fileId: string;
  originalName: string;
  size: number;
  status: string;
}

interface RustMappingSuggestion {
  source_column: string;
  suggested_field: string | null;
  confidence: number;
  reason: string;
}

interface RustUploadResponse {
  upload_id: string;
  filename?: string;
  headers: string[];
  sample_rows: Array<Record<string, string>>;
  suggestions: RustMappingSuggestion[];
  warnings: string[];
}

const rustUploads = new Map<string, RustUploadResponse>()

const rustFieldToSchemaColumn: Record<string, string> = {
  fullName: 'contact_name',
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  company: 'business_name',
  jobTitle: 'contact_title',
  website: 'website',
  industry: 'industry',
  address: 'address',
  city: 'city',
  state: 'state',
  postalCode: 'zip_code',
  country: 'country',
  notes: 'description',
  leadType: 'lead_category',
}

const schemaColumnToRustField: Record<string, string> = Object.fromEntries(
  Object.entries(rustFieldToSchemaColumn).map(([field, column]) => [column, field]),
)

const toUiMappingSuggestion = (suggestion: RustMappingSuggestion): MappingSuggestion => ({
  sourceColumn: suggestion.source_column,
  targetColumn: suggestion.suggested_field ? rustFieldToSchemaColumn[suggestion.suggested_field] || null : null,
  confidence: suggestion.confidence,
})

// Modified uploadFile to accept onUploadProgress callback
export const uploadFile = async (
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void // Optional callback for progress
): Promise<UploadFileResponse> => {
  if (!restGatewayEnabled) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await rustIngestApi.post<RustUploadResponse>('/v1/csv/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000,
      onUploadProgress,
    })

    rustUploads.set(response.data.upload_id, response.data)

    return {
      jobId: response.data.upload_id,
      fileId: response.data.upload_id,
      originalName: response.data.filename || file.name,
      size: file.size,
      status: 'ready_for_mapping',
    }
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const config: CustomRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for large files
      onUploadProgress: onUploadProgress, // Pass the callback here
    };
    const response = await api.post<UploadFileResponse>('/api/upload', formData, config);

    // Ensure the response structure matches UploadFileResponse.
    if (typeof response.data.jobId !== 'string' || typeof response.data.fileId !== 'string') {
      console.error('Invalid response structure from /api/upload:', response.data);
      throw new Error('Received invalid data structure from upload endpoint.');
    }

    return response.data as UploadFileResponse;
  } catch (error) {
    // Error handling is now more centralized in the interceptor,
    // which adds a userMessage to the error object.
    console.error('File upload error in uploadFile service:', error);

    // Provide more specific error messages based on the error type
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error('Server error response:', error.response.data);
      console.error('Status code:', error.response.status);

      if (error.response.status === 413) {
        throw new Error('File is too large. Maximum file size is 1GB.');
      } else {
        throw new Error(`Server error: ${error.response.data.message || error.response.statusText}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      throw new Error('No response from server. The upload may have timed out or the server is unreachable.');
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

export interface MappingSuggestionsResponse {
    headers: Array<string>;
    mappingSuggestions: Array<{ sourceColumn: string; targetColumn: string; confidence: number }>;
    sampleData?: Array<Record<string, any>>;
    jobId?: string;
}

export const getMappingSuggestions = async (fileId: string): Promise<MappingSuggestionsResponse> => {
    if (!restGatewayEnabled) {
      const upload = rustUploads.get(fileId)
      if (!upload) {
        throw new Error('Upload preview is no longer available. Upload the file again to remap it.')
      }

      return {
        headers: upload.headers,
        mappingSuggestions: upload.suggestions.map(toUiMappingSuggestion),
        sampleData: upload.sample_rows,
      }
    }

    const response = await api.get(`/api/mapping/${fileId}`);
    return response.data as MappingSuggestionsResponse;
};

export const confirmMapping = async (fileId: string, mappings: Mapping[]) => {
  if (!restGatewayEnabled) {
    const rustMappings = mappings
      .map((mapping) => ({
        source_column: mapping.sourceColumn,
        target_field: schemaColumnToRustField[mapping.targetColumn],
      }))
      .filter((mapping) => Boolean(mapping.target_field))

    await rustIngestApi.post(`/v1/uploads/${fileId}/confirm`, {
      dataset_name: null,
      mapping: rustMappings,
    })

    await rustIngestApi.post(`/v1/uploads/${fileId}/process`)

    return {
      jobId: fileId,
      fileId,
      status: 'processing_started',
    }
  }

  const response = await api.post(`/api/mapping/${fileId}/confirm`, { mappings })
  return response.data
}

export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  if (!restGatewayEnabled && rustUploads.has(jobId)) {
    const now = new Date().toISOString()
    return {
      id: jobId,
      status: 'processing',
      progress: 75,
      step: 'spacetime-bridge-pending',
      message: 'Upload preview and process intent are recorded. Live row storage is waiting on the SpacetimeDB reducer bridge.',
      createdAt: now,
      updatedAt: now,
    }
  }

  const response = await api.get(`/api/jobs/${jobId}`);
  return response.data as JobStatus;
}

export const queryData = async (page: number = 1, limit: number = 10, filters: Record<string, any> = {}) => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    } as DataQueryResult
  }

  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  
  // Only add filters param if there are actual filters
  const activeFilters: Record<string, any> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      activeFilters[key] = value
    }
  })
  
  if (Object.keys(activeFilters).length > 0) {
    params.append('filters', JSON.stringify(activeFilters))
  }

  const response = await api.get(`/api/data?${params}`)
  return response.data as DataQueryResult
}

export const deleteDataRecord = async (recordId: string): Promise<{ success: boolean; id: string; message: string }> => {
  requireRestGateway('Record deletion')

  const response = await api.delete(`/api/data/${recordId}`)
  return response.data as { success: boolean; id: string; message: string }
}

export interface DashboardStatsResponse {
    totalRecords: number;
    insights: Array<string>;
    [key: string]: any; // For additional dynamic properties
}

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
    if (!restGatewayEnabled) {
      return {
        totalRecords: 0,
        insights: [
          'Rust upload, preview, and mapping suggestions are ready. Live record analytics will populate after reducer delivery is connected.',
        ],
        byIndustry: { data: [], labels: [] },
        byState: { data: [], labels: [] },
        byFoundedYear: { data: [], labels: [] },
        byEmployeeCount: { data: [], labels: [] },
      }
    }

    const response = await api.get('/api/dashboard/stats');
    return response.data as DashboardStatsResponse;
};

export interface DataInsightsResponse {
    insights: Array<{ field: string; insight: string } | string>;
    recordCount: number;
    message?: string;
}

export const getDataInsights = async (filters: Record<string, any> = {}): Promise<DataInsightsResponse> => {
    if (!restGatewayEnabled) {
      return {
        insights: [],
        recordCount: 0,
        message: 'Insights will populate after live records are delivered to SpacetimeDB.',
      }
    }

    const params = new URLSearchParams(filters);
    const response = await api.get(`/api/data/insights?${params}`);
    return response.data as DataInsightsResponse;
};

export interface DataAnomaliesResponse {
    anomalies: Array<{
        anomalies: Array<{ field: string; value: any }>;
        record: Record<string, any>;
    }>;
    recordCount: number;
    message?: string;
}

export const getDataAnomalies = async (filters: Record<string, any> = {}): Promise<DataAnomaliesResponse> => {
    if (!restGatewayEnabled) {
      return {
        anomalies: [],
        recordCount: 0,
        message: 'Anomaly detection will populate after live records are delivered to SpacetimeDB.',
      }
    }

    const params = new URLSearchParams(filters);
    const response = await api.get(`/api/data/anomalies?${params}`);
    return response.data as DataAnomaliesResponse;
};

export interface DataCleaningSuggestionsResponse {
    suggestions: Array<{ field: string; suggestion: string; issue?: string; regex?: string }>;
    recordCount: number;
    message?: string;
}

export const getDataCleaningSuggestions = async (filters: Record<string, any> = {}): Promise<DataCleaningSuggestionsResponse> => {
    if (!restGatewayEnabled) {
      return {
        suggestions: [],
        recordCount: 0,
        message: 'Cleaning suggestions will populate after live records are delivered to SpacetimeDB.',
      }
    }

    const params = new URLSearchParams(filters);
    const response = await api.get(`/api/data/cleaning-suggestions?${params}`);
    return response.data as DataCleaningSuggestionsResponse;
};

export interface NaturalLanguageQueryResponse {
    error?: string;
    results?: Array<Record<string, any>>;
    explanation?: string;
    sqlQuery?: string;
}

export const naturalLanguageQuery = async (query: string): Promise<NaturalLanguageQueryResponse> => {
    if (!restGatewayEnabled) {
      return {
        results: [],
        explanation: `Live query support is waiting on the SpacetimeDB record bridge. Query received: "${query}".`,
      }
    }

    const response = await api.post('/api/data/natural-language-query', { query });
    return response.data as NaturalLanguageQueryResponse;
};

// Batch upload and dataset management
export const uploadBatch = async (files: File[], datasetName: string, category: string, tags: string[]) => {
  if (!restGatewayEnabled) {
    const uploads = await Promise.all(files.map((file) => uploadFile(file)))

    return {
      datasetName,
      category,
      tags,
      files: uploads,
      status: 'ready_for_mapping',
      message: 'Files are uploaded through the Rust ingest API and ready for mapping.',
    }
  }

  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  formData.append('datasetName', datasetName)
  formData.append('category', category)
  if (tags.length > 0) {
    formData.append('tags', tags.join(','))
  }

  const response = await api.post('/api/batch/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getDatasets = async (page: number = 1, limit: number = 10, category?: string) => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      meta: {
        total: 0,
        page,
        limit,
      },
    }
  }

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (category) {
    params.append('category', category);
  }
  const response = await api.get('/api/datasets', { params });
  return response.data;
};


export const getDataset = async (id: string) => {
  if (!restGatewayEnabled) {
    throw new Error(`Dataset ${id} is not available until live record storage is connected.`)
  }

  const response = await api.get(`/api/datasets/${id}`);
  return response.data
}

export const getFileQualityReport = async (fileId: string) => {
  if (!restGatewayEnabled) {
    return {
      fileId,
      score: 0,
      issues: [],
      summary: 'Quality reports will populate after live records are delivered to SpacetimeDB.',
    }
  }

  const response = await api.get(`/api/files/${fileId}/quality`)
  return response.data
}

export const mergeFiles = async (fileIds: string[], strategy: string, keyColumns: string[]) => {
  requireRestGateway('File merging')

  const response = await api.post('/api/files/merge', {
    fileIds,
    strategy,
    keyColumns,
  })
  return response.data
}

export const getSchemaPatterns = async () => {
  if (!restGatewayEnabled) {
    return []
  }

  const response = await api.get('/api/schema-patterns')
  return response.data
}

// Dataset relationships interface
export interface DatasetRelationshipsResponse {
  datasetId: string;
  datasetName: string;
  totalRelationships: number;
  relationships: Array<{
    id: string;
    relationshipType: string;
    confidence: number;
    source: {
      fileId: string;
      fileName: string;
      column: string;
      recordCount: number;
    };
    target: {
      fileId: string;
      fileName: string;
      column: string;
      recordCount: number;
    };
    createdAt: string;
  }>;
  relationshipsByType: Record<string, any[]>;
  summary: {
    filesInvolved: number;
    averageConfidence: number;
    typeDistribution: Array<{
      type: string;
      count: number;
    }>;
  };
}

export const getDatasetRelationships = async (datasetId: string): Promise<DatasetRelationshipsResponse> => {
  if (!restGatewayEnabled) {
    return {
      datasetId,
      datasetName: 'Live records pending',
      totalRelationships: 0,
      relationships: [],
      relationshipsByType: {},
      summary: {
        filesInvolved: 0,
        averageConfidence: 0,
        typeDistribution: [],
      },
    }
  }

  const response = await api.get(`/api/datasets/${datasetId}/relationships`);
  return response.data as DatasetRelationshipsResponse;
};

// Service function for creating a dataset
export interface CreateDatasetPayload {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  fileIds: string[]; // Array of fileUpload IDs from /api/upload response
}

export interface CreateDatasetResponse {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  total_records: number;
  files?: Array<{
    id: string;
    original_name: string;
    status: string;
    record_count: number;
    quality_score?: number;
  }>;
  created_at: string;
  updated_at: string;
}

export const createDataset = async (payload: CreateDatasetPayload): Promise<CreateDatasetResponse> => {
  if (!restGatewayEnabled) {
    throw new Error(`Dataset creation for "${payload.name}" will be available after live record storage is connected.`)
  }

  try {
    const response = await api.post('/api/datasets', payload);
    return response.data as CreateDatasetResponse;
  } catch (error) {
    console.error('Create dataset API error:', error);
    // The interceptor should add a userMessage to the error.
    throw error;
  }
};


// Import mapping types
import {
MappingConfig,
MappingConfigResponse,
MappingMode,
MappingModeResponse,
SetMappingModeRequest,
SetMappingModeResponse,
TestGeminiConnectionResponse,
UpdateMappingConfigRequest,
UpdateMappingConfigResponse
} from '../types/mapping.types';

/**
 * Get the current mapping mode configuration
 * @returns The current mapping mode (heuristic, gemini, or auto)
 */
export const getMappingMode = async (): Promise<MappingModeResponse> => {
  if (!restGatewayEnabled) {
    return {
      mode: MappingMode.HEURISTIC,
      available: {
        heuristic: true,
        gemini: false,
      },
      config: {
        geminiEnabled: false,
        geminiConfigured: false,
        fallbackEnabled: true,
        model: 'heuristic',
      },
    }
  }

  const response = await api.get('/api/mapping/mode');
  return response.data as MappingModeResponse;
};

/**
 * Set the mapping mode for column detection
 * @param mode The mapping mode to set (heuristic, gemini, or auto)
 * @param persistToConfig Whether to save this setting permanently
 * @returns Response indicating success and the new mode
 */
export const setMappingMode = async (mode: MappingMode | string, persistToConfig: boolean = false): Promise<SetMappingModeResponse> => {
  if (!restGatewayEnabled) {
    return {
      mode: MappingMode.HEURISTIC,
      message: 'The Rust ingest path currently uses deterministic heuristic mapping.',
      success: mode === MappingMode.HEURISTIC || mode === 'heuristic',
    }
  }

  const request: SetMappingModeRequest = { mode: mode as string, persistToConfig };
  const response = await api.put('/api/mapping/mode', request);
  return response.data as SetMappingModeResponse;
};

/**
 * Get the current mapping configuration
 * @returns The current mapping configuration including API keys and model settings
 */
export const getMappingConfig = async (): Promise<MappingConfigResponse> => {
  if (!restGatewayEnabled) {
    return {
      config: {
        geminiModel: 'gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 2048,
        enableGeminiMapping: false,
        fallbackToHeuristic: true,
      },
    }
  }

  const response = await api.get('/api/mapping/config');
  return response.data as MappingConfigResponse;
};

/**
 * Update the mapping configuration
 * @param config Partial configuration to update (only provided fields will be updated)
 * @returns Updated configuration and success status
 */
export const updateMappingConfig = async (config: Partial<MappingConfig>): Promise<UpdateMappingConfigResponse> => {
  if (!restGatewayEnabled) {
    return {
      config: {
        ...config,
        enableGeminiMapping: false,
        fallbackToHeuristic: true,
      },
      message: 'Mapping configuration is read-only on the Rust ingest path until AI settings are ported.',
      success: true,
    }
  }

  const request: UpdateMappingConfigRequest = { config };
  const response = await api.put('/api/mapping/config', request);
  return response.data as UpdateMappingConfigResponse;
};

/**
 * Test the Gemini API connection
 * @returns Connection test results including model info and latency
 */
export const testGeminiConnection = async (): Promise<TestGeminiConnectionResponse> => {
  if (!restGatewayEnabled) {
    return {
      success: false,
      message: 'Gemini mapping is not enabled on the Rust ingest path yet.',
      error: 'Gemini settings are local-only until the optional mapping provider is connected to the Rust path.',
    }
  }

  const response = await api.get('/api/mapping/test-gemini');
  return response.data as TestGeminiConnectionResponse;
};

// File management API calls
export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  size: number;
  uploadDate: string;
  status: 'processing' | 'completed' | 'failed' | 'pending_mapping';
  recordCount?: number;
  columnCount?: number;
  error?: string;
  jobId?: string;
}

export interface ListFilesResponse {
  files: FileItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const listFiles = async (page: number = 1, limit: number = 10, status?: string): Promise<ListFilesResponse> => {
  if (!restGatewayEnabled) {
    return {
      files: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    }
  }

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) {
    params.append('status', status);
  }
  const response = await api.get(`/api/files?${params}`);
  return response.data as ListFilesResponse;
};

export interface DuplicateFileResponse {
  success: boolean;
  fileId: string;
  originalFileId: string;
  message: string;
  file: {
    id: string;
    name: string;
    originalName: string;
    size: number;
    status: string;
    uploadDate: string;
  };
}

export const duplicateFile = async (fileId: string): Promise<DuplicateFileResponse> => {
  requireRestGateway('File duplication')

  const response = await api.post(`/api/files/${fileId}/duplicate`);
  return response.data as DuplicateFileResponse;
};

export const downloadFile = async (fileId: string): Promise<void> => {
  requireRestGateway('File download')

  try {
    const response = await api.get(`/api/files/${fileId}/download`, {
      responseType: 'blob',
    });
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    // Create a blob URL and trigger download
    const contentType = response.headers['content-type'];
    const blob = new Blob([response.data as BlobPart], { type: typeof contentType === 'string' ? contentType : 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

// Activity API types
export interface Activity {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  userId?: string;
  status?: string;
  duration?: number;
}

export interface GetActivitiesParams {
  page?: number;
  limit?: number;
  action?: string | string[];
  entityType?: string;
  entityId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetActivitiesResponse {
  data: Activity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivitySummary {
  summary: Array<{
    action: string;
    status: string;
    _count: { id: number };
  }>;
  recentErrors: Activity[];
  fileStats: Array<{
    entityType: string;
    _count: { id: number };
  }>;
  period: {
    hours: number;
    since: string;
  };
}

// Activity API functions
export const getRecentActivities = async (params?: GetActivitiesParams): Promise<GetActivitiesResponse> => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      meta: {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: 0,
        totalPages: 0,
      },
    }
  }

  const response = await api.get('/api/activities', { params });
  return response.data as GetActivitiesResponse;
};

export const getActivitySummary = async (hours: number = 24): Promise<ActivitySummary> => {
  if (!restGatewayEnabled) {
    return {
      summary: [],
      recentErrors: [],
      fileStats: [],
      period: {
        hours,
        since: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      },
    }
  }

  const response = await api.get('/api/activities/summary', { params: { hours } });
  return response.data as ActivitySummary;
};

export const getEntityTimeline = async (entityType: string, entityId: string): Promise<Activity[]> => {
  if (!restGatewayEnabled) {
    return []
  }

  const response = await api.get(`/api/activities/entity/${entityType}/${entityId}`);
  return response.data as Activity[];
};

// Analytics API types
export interface DataAggregateParams {
  field: string;
  groupBy?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: Record<string, any>;
  limit?: number;
  sortBy?: 'value' | 'label';
  sortOrder?: 'asc' | 'desc';
}

export interface DataAggregateResponse {
  data: Array<{
    name: string;
    value: number;
  }>;
  total: number;
  aggregation: string;
  field: string;
  groupBy?: string;
}

export interface DataTimeseriesParams {
  field: string;
  dateField: string;
  interval: 'hour' | 'day' | 'week' | 'month';
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: Record<string, any>;
  startDate?: string;
  endDate?: string;
}

export interface DataTimeseriesResponse {
  data: Array<{
    date: string;
    value: number;
  }>;
  interval: string;
  aggregation: string;
  field: string;
  dateField: string;
}

export interface DataDistributionParams {
  field: string;
  bins?: number;
  filters?: Record<string, any>;
}

export interface DataDistributionResponse {
  data: Array<{
    bin: number;
    range: string;
    count: number;
    start: number;
    end: number;
  }>;
  field: string;
  bins: number;
  min: number;
  max: number;
  total: number;
}

// Analytics API functions
export const getDataAggregate = async (params: DataAggregateParams): Promise<DataAggregateResponse> => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      total: 0,
      aggregation: params.aggregation,
      field: params.field,
      groupBy: params.groupBy,
    }
  }

  const queryParams = new URLSearchParams();
  queryParams.append('field', params.field);
  if (params.groupBy) queryParams.append('groupBy', params.groupBy);
  queryParams.append('aggregation', params.aggregation);
  if (params.filters) queryParams.append('filters', JSON.stringify(params.filters));
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const response = await api.get(`/api/data/aggregate?${queryParams}`);
  return response.data as DataAggregateResponse;
};

export const getDataTimeseries = async (params: DataTimeseriesParams): Promise<DataTimeseriesResponse> => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      interval: params.interval,
      aggregation: params.aggregation,
      field: params.field,
      dateField: params.dateField,
    }
  }

  const queryParams = new URLSearchParams();
  queryParams.append('field', params.field);
  queryParams.append('dateField', params.dateField);
  queryParams.append('interval', params.interval);
  queryParams.append('aggregation', params.aggregation);
  if (params.filters) queryParams.append('filters', JSON.stringify(params.filters));
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await api.get(`/api/data/timeseries?${queryParams}`);
  return response.data as DataTimeseriesResponse;
};

export const getDataDistribution = async (params: DataDistributionParams): Promise<DataDistributionResponse> => {
  if (!restGatewayEnabled) {
    return {
      data: [],
      field: params.field,
      bins: params.bins || 0,
      min: 0,
      max: 0,
      total: 0,
    }
  }

  const queryParams = new URLSearchParams();
  queryParams.append('field', params.field);
  if (params.bins) queryParams.append('bins', params.bins.toString());
  if (params.filters) queryParams.append('filters', JSON.stringify(params.filters));

  const response = await api.get(`/api/data/distribution?${queryParams}`);
  return response.data as DataDistributionResponse;
};
