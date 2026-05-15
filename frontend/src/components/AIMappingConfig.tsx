import {
Api,
CheckCircle,
Close,
Error,
Save,
TuneOutlined,
Visibility,
VisibilityOff
} from '@mui/icons-material'
import {
Alert,
Box,
Button,
Chip,
CircularProgress,
Dialog,
DialogActions,
DialogContent,
DialogTitle,
Divider,
FormControl,
FormControlLabel,
Grid,
IconButton,
InputAdornment,
InputLabel,
LinearProgress,
MenuItem,
Select,
Slider,
Switch,
TextField,
Typography
} from '@mui/material'
import { useEffect,useState } from 'react'
import {
getMappingConfig,
getMappingMode,
setMappingMode,
testGeminiConnection,
updateMappingConfig,
} from '../services/api'

interface AIMappingConfigProps {
  open: boolean
  onClose: () => void
  onSave?: () => void
}

interface AIConfig {
  mode: 'heuristic' | 'gemini' | 'auto'
  apiKey: string
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro'
  temperature: number
  maxTokens: number
  autoModeThreshold: number
  enableCache: boolean
}

const AIMappingConfig = ({ open, onClose, onSave }: AIMappingConfigProps) => {
  const [config, setConfig] = useState<AIConfig>({
    mode: 'heuristic',
    apiKey: '',
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxTokens: 2048,
    autoModeThreshold: 0.7,
    enableCache: true
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      // Load configuration when dialog opens
      loadConfig()
    }
  }, [open])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const configResponse = await getMappingConfig()
      const modeData = await getMappingMode()
      const configData = configResponse.config
      
      // Combine the responses to match the expected AIConfig interface
      const data: AIConfig = {
        mode: modeData.mode as AIConfig['mode'] || 'heuristic',
        apiKey: '', // API key is not returned for security
        model: (configData.geminiModel as AIConfig['model']) || 'gemini-2.5-flash',
        temperature: configData.temperature || 0.3,
        maxTokens: configData.maxTokens || 2048,
        autoModeThreshold: 0.7, // Not exposed by the mapping API yet
        enableCache: true // Not exposed by the mapping API yet
      }
      setConfig(data)
    } catch (err) {
      console.error('Failed to load mapping configuration:', err)
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      apiKey: event.target.value
    })
  }

  const handleModelChange = (event: any) => {
    setConfig({
      ...config,
      model: event.target.value as AIConfig['model']
    })
  }

  const handleTemperatureChange = (_event: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      temperature: newValue as number
    })
  }

  const handleMaxTokensChange = (_event: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      maxTokens: newValue as number
    })
  }

  const handleAutoModeThresholdChange = (_event: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      autoModeThreshold: newValue as number
    })
  }

  const handleCacheToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      enableCache: event.target.checked
    })
  }

  const testConnection = async () => {
    if (!config.apiKey) {
      setError('API key is required')
      return
    }

    try {
      setTestStatus('testing')
      setError(null)
      
      await updateMappingConfig({
        geminiApiKey: config.apiKey,
        geminiModel: config.model
      })

      const result = await testGeminiConnection()
      
      if (result.success) {
        setTestStatus('success')
        setTimeout(() => setTestStatus('idle'), 3000)
      } else {
        setTestStatus('error')
        setError(result.message || 'Connection test failed')
      }
    } catch (err: any) {
      setTestStatus('error')
      setError(err.response?.data?.message || 'Failed to test connection')
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      await updateMappingConfig({
        geminiApiKey: config.apiKey,
        geminiModel: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        enableGeminiMapping: config.mode !== 'heuristic',
        fallbackToHeuristic: true
      })
      
      await setMappingMode(config.mode, true)
      
      if (onSave) {
        onSave()
      }
      
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneOutlined />
            <Typography variant="h6">Optional Mapping Provider</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={12}>
            <Typography variant="subtitle1" gutterBottom>
              API Configuration
            </Typography>
            <TextField
              fullWidth
              label="Gemini API Key"
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={handleApiKeyChange}
              margin="normal"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              helperText="Your Google AI Studio API key"
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
              <FormControl sx={{ flexGrow: 1 }}>
                <InputLabel>Model</InputLabel>
                <Select
                  value={config.model}
                  onChange={handleModelChange}
                  label="Model"
                >
                  <MenuItem value="gemini-2.5-flash">
                    <Box>
                      <Typography variant="body2">Gemini 2.5 Flash</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fast and efficient
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="gemini-2.5-pro">
                    <Box>
                      <Typography variant="body2">Gemini 2.5 Pro</Typography>
                      <Typography variant="caption" color="text.secondary">
                        More accurate
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                onClick={testConnection}
                disabled={!config.apiKey || testStatus === 'testing'}
                startIcon={
                  testStatus === 'testing' ? <CircularProgress size={20} /> :
                  testStatus === 'success' ? <CheckCircle color="success" /> :
                  testStatus === 'error' ? <Error color="error" /> :
                  <Api />
                }
              >
                Test
              </Button>
            </Box>
          </Grid>

          <Grid size={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              Model Parameters
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom>Temperature: {config.temperature}</Typography>
              <Slider
                value={config.temperature}
                onChange={handleTemperatureChange}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: 'Precise' },
                  { value: 0.5, label: 'Balanced' },
                  { value: 1, label: 'Creative' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography gutterBottom>Max Tokens: {config.maxTokens}</Typography>
              <Slider
                value={config.maxTokens}
                onChange={handleMaxTokensChange}
                min={512}
                max={4096}
                step={512}
                marks={[
                  { value: 512, label: '512' },
                  { value: 2048, label: '2048' },
                  { value: 4096, label: '4096' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>

          <Grid size={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              Auto Mode Settings
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom>
                Auto Mode Threshold: {Math.round(config.autoModeThreshold * 100)}%
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Use provider-backed mapping when heuristic confidence is below this threshold
              </Typography>
              <Slider
                value={config.autoModeThreshold}
                onChange={handleAutoModeThresholdChange}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.5, label: '50%' },
                  { value: 1, label: '100%' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={config.enableCache}
                  onChange={handleCacheToggle}
                />
              }
              label="Enable mapping cache"
              sx={{ mt: 2 }}
            />
          </Grid>

          <Grid size={12}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current configuration uses: {' '}
                <Chip 
                  label={config.mode.toUpperCase()} 
                  size="small" 
                  color={config.mode === 'heuristic' ? 'default' : 'primary'}
                  sx={{ mx: 0.5 }}
                />
                mode with {' '}
                <Chip 
                  label={config.model} 
                  size="small" 
                  color="secondary"
                  sx={{ mx: 0.5 }}
                />
                model
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AIMappingConfig
