/**
 * Mapping API service module
 * Provides a clean interface for all mapping-related API operations
 */

import {
getMappingConfig as _getMappingConfig,
getMappingMode as _getMappingMode,
setMappingMode as _setMappingMode,
testGeminiConnection as _testGeminiConnection,
updateMappingConfig as _updateMappingConfig
} from './api';

import { MappingMode } from '../constants/mapping-modes';
import { SetMappingModeResponse } from '../types/mapping.types';

/**
 * Mapping API service
 * Encapsulates all mapping-related API operations
 */
export const MappingAPI = {
  /**
   * Get the current mapping mode
   * @example
   * const { mode } = await MappingAPI.getMode();
   * console.log('Current mode:', mode); // 'heuristic', 'gemini', or 'auto'
   */
  getMode: _getMappingMode,

  /**
   * Set the mapping mode
   * @example
   * const result = await MappingAPI.setMode(MappingMode.GEMINI);
   * if (result.success) {
   *   console.log('Mode changed to:', result.mode);
   * }
   */
  setMode: (mode: MappingMode, persistToConfig: boolean = false): Promise<SetMappingModeResponse> => {
    return _setMappingMode(mode, persistToConfig);
  },

 /**
   * Get the current mapping configuration
   * @example
   * const { config } = await MappingAPI.getConfig();
   * console.log('Gemini model:', config.geminiModel);
   */
  getConfig: _getMappingConfig,

  /**
   * Update mapping configuration
   * @example
   * const result = await MappingAPI.updateConfig({
   *   fallbackToHeuristic: true,
   *   enableGeminiMapping: false
   * });
   */
  updateConfig: _updateMappingConfig,

  /**
   * Test Gemini connection
   * @example
   * const result = await MappingAPI.testGemini();
   * if (result.success) {
   *   console.log('Gemini is available:', result.details);
   * }
   */
  testGemini: _testGeminiConnection,

  /**
   * Helper method to check if a specific mode is available
   * @param mode The mode to check
   * @returns Promise resolving to availability status
   */
  async isModeAvailable(mode: MappingMode): Promise<boolean> {
    try {
      const modeInfo = await this.getMode();
      
      switch (mode) {
        case MappingMode.HEURISTIC:
          return modeInfo.available.heuristic;
        case MappingMode.GEMINI:
          return modeInfo.available.gemini;
        case MappingMode.AUTO:
          // AUTO is available if either mode is available
          return modeInfo.available.heuristic || modeInfo.available.gemini;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking availability for mode ${mode}:`, error);
      return false;
    }
  },

  /**
   * Helper method to switch to best available mode
   * @returns The mode that was set
   */
  async switchToBestAvailable(): Promise<MappingMode> {
    // Just use AUTO mode which will pick the best available
    const result = await this.setMode(MappingMode.AUTO);
    if (result.success) {
      return MappingMode.AUTO;
    }

    // If AUTO fails, try Gemini explicitly
    if (await this.isModeAvailable(MappingMode.GEMINI)) {
      const geminiResult = await this.setMode(MappingMode.GEMINI);
      if (geminiResult.success) return MappingMode.GEMINI;
    }

    // Fall back to heuristic
    await this.setMode(MappingMode.HEURISTIC);
    return MappingMode.HEURISTIC;
  }
};

// Export convenience functions for direct use
export const getMappingMode = MappingAPI.getMode;
export const setMappingMode = MappingAPI.setMode;
export const getMappingConfig = MappingAPI.getConfig;
export const updateMappingConfig = MappingAPI.updateConfig;
export const testGeminiConnection = MappingAPI.testGemini;
