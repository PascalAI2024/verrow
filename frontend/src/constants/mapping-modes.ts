/**
 * Constants for mapping modes
 * These constants define the available mapping modes for column detection
 */

export enum MappingMode {
  HEURISTIC = 'heuristic',
  GEMINI = 'gemini',
  AUTO = 'auto'
}

export const MappingModeLabels: Record<MappingMode, string> = {
  [MappingMode.HEURISTIC]: 'Heuristic (Pattern-based)',
  [MappingMode.GEMINI]: 'Google Gemini',
  [MappingMode.AUTO]: 'Auto (Best Available)'
};

export const MappingModeDescriptions: Record<MappingMode, string> = {
  [MappingMode.HEURISTIC]: 'Fast pattern-based column detection using built-in rules',
  [MappingMode.GEMINI]: 'Optional provider-backed column mapping using Google Gemini',
  [MappingMode.AUTO]: 'Automatically selects the best available mapping method'
};

export const DEFAULT_MAPPING_MODE = MappingMode.HEURISTIC;
