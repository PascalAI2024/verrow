/**
 * React hook for managing mapping mode state
 * Provides a convenient interface for components to work with mapping modes
 */

import { useCallback,useEffect,useState } from 'react';
import { MappingMode } from '../constants/mapping-modes';
import { MappingAPI } from '../services/mapping-api';
import {
MappingConfig,
MappingModeResponse,
TestGeminiConnectionResponse
} from '../types/mapping.types';

export interface UseMappingModeReturn {
  // Current mode information
  currentMode: MappingMode | null;
  modeInfo: MappingModeResponse | null;
  config: MappingConfig | null;
  
  // Loading states
  isLoading: boolean;
  isSwitching: boolean;
  isTesting: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  switchMode: (mode: MappingMode, persist?: boolean) => Promise<boolean>;
  updateConfig: (config: Partial<MappingConfig>) => Promise<boolean>;
  testGemini: () => Promise<TestGeminiConnectionResponse | null>;
  refresh: () => Promise<void>;
  
  // Computed properties
  isGeminiAvailable: boolean;
  isHeuristicAvailable: boolean;
}

/**
 * Hook for managing mapping mode state and operations
 */
export const useMappingMode = (): UseMappingModeReturn => {
  const [currentMode, setCurrentMode] = useState<MappingMode | null>(null);
  const [modeInfo, setModeInfo] = useState<MappingModeResponse | null>(null);
  const [config, setConfig] = useState<MappingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadMappingData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [modeResponse, configResponse] = await Promise.all([
        MappingAPI.getMode(),
        MappingAPI.getConfig()
      ]);
      
      setModeInfo(modeResponse);
      setCurrentMode(modeResponse.mode as MappingMode);
      setConfig(configResponse.config);
    } catch (err) {
      console.error('Failed to load mapping data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mapping configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMappingData();
  }, [loadMappingData]);

  // Switch mapping mode
  const switchMode = useCallback(async (mode: MappingMode, persist: boolean = false): Promise<boolean> => {
    try {
      setIsSwitching(true);
      setError(null);
      
      const result = await MappingAPI.setMode(mode, persist);
      if (result.success) {
        setCurrentMode(mode);
        // Refresh mode info after switching
        const newModeInfo = await MappingAPI.getMode();
        setModeInfo(newModeInfo);
        return true;
      }
      
      setError(result.message || 'Failed to switch mode');
      return false;
    } catch (err) {
      console.error('Failed to switch mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch mapping mode');
      return false;
    } finally {
      setIsSwitching(false);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (newConfig: Partial<MappingConfig>): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await MappingAPI.updateConfig(newConfig);
      if (result.success) {
        setConfig(result.config);
        return true;
      }
      
      setError(result.message || 'Failed to update configuration');
      return false;
    } catch (err) {
      console.error('Failed to update config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      return false;
    }
  }, []);

  // Test Gemini connection
  const testGemini = useCallback(async (): Promise<TestGeminiConnectionResponse | null> => {
    try {
      setIsTesting(true);
      setError(null);
      
      const result = await MappingAPI.testGemini();
      return result;
    } catch (err) {
      console.error('Failed to test Gemini:', err);
      setError(err instanceof Error ? err.message : 'Failed to test Gemini connection');
      return null;
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Computed properties
  const isGeminiAvailable = modeInfo?.available.gemini || false;
  const isHeuristicAvailable = modeInfo?.available.heuristic || false;

  return {
    currentMode,
    modeInfo,
    config,
    isLoading,
    isSwitching,
    isTesting,
    error,
    switchMode,
    updateConfig,
    testGemini,
    refresh: loadMappingData,
    isGeminiAvailable,
    isHeuristicAvailable
  };
};