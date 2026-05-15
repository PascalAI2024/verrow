/**
 * Central export point for all API services
 * This file provides a convenient way to import all API functions from a single location
 */

// Core API functions (except mapping-related ones to avoid conflicts)
export {
api,confirmMapping,getDashboardStats,getDataAnomalies,
getDataCleaningSuggestions,getDataInsights,getDataset,getDatasetRelationships,getDatasets,getFileQualityReport,getJobStatus,getMappingSuggestions,getSchemaPatterns,mergeFiles,naturalLanguageQuery,queryData,uploadBatch,uploadFile
} from './api';

// Mapping-specific API functions (these override the ones from api.ts)
export {
MappingAPI,getMappingConfig,getMappingMode,
setMappingMode,testGeminiConnection,updateMappingConfig
} from './mapping-api';

// API configuration
export { API_URL } from './api-config';

// Re-export types for convenience
export type {
MappingConfig,
MappingConfigResponse,MappingModeResponse,
SetMappingModeRequest,
SetMappingModeResponse,TestGeminiConnectionResponse,UpdateMappingConfigRequest,
UpdateMappingConfigResponse
} from '../types/mapping.types';
