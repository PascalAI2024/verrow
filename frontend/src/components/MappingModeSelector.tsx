/**
 * Component for selecting and switching mapping modes
 * Provides a user-friendly interface for changing between heuristic, Gemini, and auto modes
 */

import {
SmartToy as AutoIcon,
CheckCircle,
Error as ErrorIcon,
AutoAwesome as GeminiIcon,
Speed as HeuristicIcon
} from '@mui/icons-material';
import {
Alert,
Box,
Button,
Chip,
CircularProgress,
FormControl,
FormControlLabel,
Paper,
Radio,
RadioGroup,
Typography
} from '@mui/material';
import React from 'react';
import { MappingMode,MappingModeDescriptions,MappingModeLabels } from '../constants/mapping-modes';
import { useMappingMode } from '../hooks/useMappingMode';

export const MappingModeSelector: React.FC = () => {
  const {
    currentMode,
    modeInfo,
    isLoading,
    isSwitching,
    error,
    switchMode,
    testGemini,
    isGeminiAvailable,
    isHeuristicAvailable
  } = useMappingMode();

  const handleModeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMode = event.target.value as MappingMode;
    await switchMode(newMode, false); // Don't persist by default
  };

  const handleTestGemini = async () => {
    await testGemini();
  };

  const getModeIcon = (mode: MappingMode) => {
    switch (mode) {
      case MappingMode.HEURISTIC:
        return <HeuristicIcon />;
      case MappingMode.GEMINI:
        return <GeminiIcon />;
      case MappingMode.AUTO:
        return <AutoIcon />;
    }
  };

  const getModeAvailability = (mode: MappingMode): boolean => {
    switch (mode) {
      case MappingMode.HEURISTIC:
        return isHeuristicAvailable;
      case MappingMode.GEMINI:
        return isGeminiAvailable;
      case MappingMode.AUTO:
        return isHeuristicAvailable || isGeminiAvailable;
      default:
        return false;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Column Mapping Mode
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={currentMode || ''}
          onChange={handleModeChange}
          aria-label="mapping mode"
        >
          {Object.values(MappingMode).map((mode) => {
            const isAvailable = getModeAvailability(mode);
            const isSelected = currentMode === mode;
            
            return (
              <Box key={mode} sx={{ mb: 2 }}>
                <FormControlLabel
                  value={mode}
                  disabled={!isAvailable || isSwitching}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getModeIcon(mode)}
                        <Typography variant="body1">
                          {MappingModeLabels[mode]}
                        </Typography>
                      </Box>
                      {isSelected && <CheckCircle color="success" fontSize="small" />}
                      {!isAvailable && (
                        <Chip
                          label="Not Available"
                          size="small"
                          color="warning"
                          icon={<ErrorIcon />}
                        />
                      )}
                    </Box>
                  }
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  {MappingModeDescriptions[mode]}
                </Typography>
              </Box>
            );
          })}
        </RadioGroup>
      </FormControl>

      {modeInfo?.config && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Configuration
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {modeInfo.config.geminiConfigured && (
              <Chip label="Gemini Configured" size="small" color="success" />
            )}
            {modeInfo.config.fallbackEnabled && (
              <Chip label="Fallback Enabled" size="small" color="info" />
            )}
            {modeInfo.config.model && (
              <Chip label={`Model: ${modeInfo.config.model}`} size="small" />
            )}
          </Box>
        </Box>
      )}

      {currentMode === MappingMode.GEMINI && !isGeminiAvailable && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning" action={
            <Button color="inherit" size="small" onClick={handleTestGemini}>
              Test Connection
            </Button>
          }>
            Gemini is not available. Please check your API configuration.
          </Alert>
        </Box>
      )}

      {isSwitching && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Switching mode...
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
