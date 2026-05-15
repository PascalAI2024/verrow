/**
 * Helper utilities for mapping mode operations
 * Provides convenience functions for working with mapping modes and configurations
 */

import { MappingMode } from '../constants/mapping-modes';
import { MappingConfig,MappingModeResponse } from '../types/mapping.types';

/**
 * Check if a specific mapping mode is currently active
 */
export const isModeActive = (currentMode: string | null, targetMode: MappingMode): boolean => {
  return currentMode === targetMode;
};

/**
 * Get the effective mode when AUTO is selected
 */
export const getEffectiveMode = (modeInfo: MappingModeResponse): MappingMode => {
  if (modeInfo.mode === MappingMode.AUTO) {
    // When AUTO is selected, determine which mode is actually being used
    if (modeInfo.available.gemini && modeInfo.config.geminiConfigured) {
      return MappingMode.GEMINI;
    }
    return MappingMode.HEURISTIC;
  }
  return modeInfo.mode as MappingMode;
};

/**
 * Check if Gemini configuration is complete
 */
export const isGeminiConfigured = (config: MappingConfig): boolean => {
  return !!(
    config.geminiApiKey &&
    config.geminiModel &&
    config.enableGeminiMapping
  );
};

/**
 * Get a user-friendly message for the current mapping status
 */
export const getMappingStatusMessage = (modeInfo: MappingModeResponse): string => {
  const effectiveMode = getEffectiveMode(modeInfo);
  
  if (modeInfo.mode === MappingMode.AUTO) {
    return `Auto mode is using ${effectiveMode === MappingMode.GEMINI ? 'Gemini AI' : 'heuristic patterns'}`;
  }
  
  if (modeInfo.mode === MappingMode.GEMINI && !modeInfo.available.gemini) {
    return 'Gemini mode selected but not available - falling back to heuristic';
  }
  
  return `Using ${modeInfo.mode} mode for column mapping`;
};

/**
 * Validate if a mode can be selected based on availability
 */
export const canSelectMode = (mode: MappingMode, modeInfo: MappingModeResponse): boolean => {
  switch (mode) {
    case MappingMode.HEURISTIC:
      return modeInfo.available.heuristic;
    case MappingMode.GEMINI:
      return modeInfo.available.gemini;
    case MappingMode.AUTO:
      // AUTO can be selected if at least one mode is available
      return modeInfo.available.heuristic || modeInfo.available.gemini;
    default:
      return false;
  }
};

/**
 * Get recommended configuration values for a specific mode
 */
export const getRecommendedConfig = (mode: MappingMode): Partial<MappingConfig> => {
  switch (mode) {
    case MappingMode.GEMINI:
      return {
        temperature: 0.3,
        maxTokens: 2048,
        enableGeminiMapping: true,
        fallbackToHeuristic: true
      };
    case MappingMode.AUTO:
      return {
        enableGeminiMapping: true,
        fallbackToHeuristic: true
      };
    default:
      return {
        enableGeminiMapping: false,
        fallbackToHeuristic: false
      };
  }
};