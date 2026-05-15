import {
Api,
AutoAwesome,
CheckCircle,
Error,
Info,
Memory,
Save,
Settings as SettingsIcon,
Speed,
Visibility,
VisibilityOff
} from '@mui/icons-material'
import {
Alert,
Box,
Button,
Card,
CardContent,
CardHeader,
Chip,
CircularProgress,
Fade,
FormControl,
FormControlLabel,
Grid,
IconButton,
InputAdornment,
InputLabel,
MenuItem,
Radio,
RadioGroup,
Select,
Slider,
Switch,
TextField,
Typography,
Zoom
} from '@mui/material'
import { useEffect,useState } from 'react'
import {
getMappingConfig,
getMappingMode,
setMappingMode,
testGeminiConnection,
updateMappingConfig,
} from '../services/api'

interface AIConfig {
  mode: 'heuristic' | 'gemini' | 'auto'
  apiKey: string
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro'
  temperature: number
  maxTokens: number
  autoModeThreshold: number
  enableCache: boolean
}

const SettingsPage = () => {
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
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    // Load configuration from the mapping API
    const loadConfig = async () => {
      try {
        setLoading(true)
        const configResponse = await getMappingConfig()
        const modeData = await getMappingMode()
        const configData = configResponse.config
        
        // Combine the responses to match the expected AIConfig interface
        const data: AIConfig = {
          mode: (modeData.mode as AIConfig['mode']) || 'heuristic',
          apiKey: '', // API key is not returned for security
          model: (configData.geminiModel as AIConfig['model']) || 'gemini-2.5-flash',
          temperature: configData.temperature ?? 0.3,
          maxTokens: configData.maxTokens ?? 2048,
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
    loadConfig()
  }, [])

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      mode: event.target.value as AIConfig['mode']
    })
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
    if (!config.apiKey && config.mode !== 'heuristic') {
      setError('API key is required for Gemini mode')
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

  const saveConfiguration = async () => {
    try {
      setSaving(true)
      setError(null)
      setSaveSuccess(false)

      await updateMappingConfig({
        geminiApiKey: config.apiKey,
        geminiModel: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        enableGeminiMapping: config.mode !== 'heuristic',
        fallbackToHeuristic: true
      })
      
      await setMappingMode(config.mode, true)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Fade in={true}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 2 }} />
            Mapping Settings
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Configure CSV column mapping. The default Rust path uses deterministic heuristics; provider-backed mapping remains optional.
          </Typography>
        </Box>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configuration saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Zoom in={true} style={{ transitionDelay: '150ms' }}>
            <Card>
              <CardHeader
                title="Mapping Mode"
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<AutoAwesome color="primary" />}
              />
              <CardContent>
                <FormControl component="fieldset">
                  <RadioGroup value={config.mode} onChange={handleModeChange}>
                    <FormControlLabel 
                      value="heuristic" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography>Heuristic Mode</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Fast pattern-based matching using built-in rules
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="gemini" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography>Gemini Mode</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Optional provider-backed mapping for complex files
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="auto" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography>Auto Mode</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Automatically choose based on complexity and confidence
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {config.mode === 'auto' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography gutterBottom>Auto Mode Threshold</Typography>
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
                      sx={{ mt: 2 }}
                    />
                  </Box>
                )}

                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enableCache}
                        onChange={handleCacheToggle}
                      />
                    }
                    label="Enable mapping cache"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Cache similar mappings to improve performance
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Card>
              <CardHeader
                title="Optional Gemini Configuration"
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<Api color="primary" />}
              />
              <CardContent>
                <TextField
                  fullWidth
                  label="Gemini API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={handleApiKeyChange}
                  margin="normal"
                  disabled={config.mode === 'heuristic'}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                            disabled={config.mode === 'heuristic'}
                          >
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText="Your Google AI Studio API key"
                />

                <FormControl fullWidth margin="normal" disabled={config.mode === 'heuristic'}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={config.model}
                    onChange={handleModelChange}
                    label="Model"
                  >
                    <MenuItem value="gemini-2.5-flash">
                      <Box>
                        <Typography>Gemini 2.5 Flash</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Fast and efficient for most use cases
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="gemini-2.5-pro">
                      <Box>
                        <Typography>Gemini 2.5 Pro</Typography>
                        <Typography variant="caption" color="text.secondary">
                          More accurate for complex datasets
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={testConnection}
                    disabled={config.mode === 'heuristic' || testStatus === 'testing'}
                    startIcon={
                      testStatus === 'testing' ? <CircularProgress size={20} /> :
                      testStatus === 'success' ? <CheckCircle color="success" /> :
                      testStatus === 'error' ? <Error color="error" /> :
                      <Api />
                    }
                    fullWidth
                  >
                    {testStatus === 'testing' ? 'Testing Connection...' :
                     testStatus === 'success' ? 'Connection Successful' :
                     testStatus === 'error' ? 'Connection Failed' :
                     'Test Connection'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid size={12}>
          <Zoom in={true} style={{ transitionDelay: '450ms' }}>
            <Card>
              <CardHeader
                title="Advanced Settings"
                titleTypographyProps={{ variant: 'h6' }}
                avatar={<Memory color="primary" />}
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box>
                      <Typography gutterBottom>Temperature</Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Controls randomness in provider responses (0 = deterministic, 1 = creative)
                      </Typography>
                      <Slider
                        value={config.temperature}
                        onChange={handleTemperatureChange}
                        min={0}
                        max={1}
                        step={0.1}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 0.3, label: '0.3' },
                          { value: 0.7, label: '0.7' },
                          { value: 1, label: '1' }
                        ]}
                        valueLabelDisplay="auto"
                        disabled={config.mode === 'heuristic'}
                        sx={{ mt: 2 }}
                      />
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box>
                      <Typography gutterBottom>Max Tokens</Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Maximum response length (higher = more detailed analysis)
                      </Typography>
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
                        disabled={config.mode === 'heuristic'}
                        sx={{ mt: 2 }}
                      />
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Speed color="primary" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2">Current Mode</Typography>
                          <Chip 
                            label={config.mode.toUpperCase()} 
                            size="small" 
                            color={config.mode === 'heuristic' ? 'default' : 'primary'}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Info color="info" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2">API Status</Typography>
                          <Chip 
                            label={config.apiKey ? 'Configured' : 'Not Configured'} 
                            size="small" 
                            color={config.apiKey ? 'success' : 'default'}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Memory color="action" sx={{ mr: 1 }} />
                        <Box>
                          <Typography variant="body2">Cache</Typography>
                          <Chip 
                            label={config.enableCache ? 'Enabled' : 'Disabled'} 
                            size="small" 
                            color={config.enableCache ? 'success' : 'default'}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={saveConfiguration}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          size="large"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Box>
  )
}

export default SettingsPage
