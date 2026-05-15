/**
 * TypeScript types for mapping mode API responses
 * These types match the mapping configuration API responses.
 */

export { MappingMode } from '../constants/mapping-modes';

/**
 * Response for getting the current mapping mode
 */
export interface MappingModeResponse {
  mode: string;
  available: {
    heuristic: boolean;
    gemini: boolean;
  };
  config: {
    geminiEnabled: boolean;
    geminiConfigured: boolean;
    fallbackEnabled: boolean;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Request for setting a new mapping mode
 */
export interface SetMappingModeRequest {
  mode: string;  // 'heuristic' | 'gemini' | 'auto'
  persistToConfig?: boolean;
}

/**
 * Response for setting a new mapping mode
 */
export interface SetMappingModeResponse {
  mode: string;  // The mode that was set
  message: string;
  success: boolean;
}

/**
 * Configuration for mapping behavior
 */
export interface MappingConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  temperature?: number;
  maxTokens?: number;
  enableGeminiMapping?: boolean;
  fallbackToHeuristic?: boolean;
}

/**
 * Response for getting mapping configuration
 */
export interface MappingConfigResponse {
  config: MappingConfig;
  lastUpdated?: string;
}

/**
 * Request for updating mapping configuration
 */
export interface UpdateMappingConfigRequest {
  config: Partial<MappingConfig>;
}

/**
 * Response for updating mapping configuration
 */
export interface UpdateMappingConfigResponse {
  config: MappingConfig;
  message: string;
  success: boolean;
}

/**
 * Response for testing Gemini connection
 */
export interface TestGeminiConnectionResponse {
  success: boolean;
  message: string;
  error?: string;
  model?: string;
  responseTime?: number;
}

/**
 * Error response for mapping-related operations
 */
export interface MappingErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
