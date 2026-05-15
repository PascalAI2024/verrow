import {
AutoAwesome,
CheckCircle,
Info,
Psychology,
Settings,
Speed
} from '@mui/icons-material'
import {
Box,
Chip,
CircularProgress,
IconButton,
Paper,
Popover,
ToggleButton,
ToggleButtonGroup,
Tooltip,
Typography
} from '@mui/material'
import { useEffect,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMappingMode,setMappingMode } from '../services/api'

interface MappingModeToggleProps {
  onModeChange?: (mode: 'heuristic' | 'gemini' | 'auto') => void
  compact?: boolean
}

const MappingModeToggle = ({ onModeChange, compact = false }: MappingModeToggleProps) => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'heuristic' | 'gemini' | 'auto'>('heuristic')
  const [loading, setLoading] = useState(true)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Load current mode from the mapping API
    const loadMode = async () => {
      try {
        const data = await getMappingMode()
        setMode((data.mode as typeof mode) || 'heuristic')
        setApiConfigured(data.config.geminiConfigured)
      } catch (err) {
        console.error('Failed to load mapping mode:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMode()
  }, [])

  const handleModeChange = async (_event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (!newMode || newMode === mode) return

    if ((newMode === 'gemini' || newMode === 'auto') && !apiConfigured) {
      setAnchorEl(_event.currentTarget)
      return
    }

    try {
      setMode(newMode as typeof mode)
      
      await setMappingMode(newMode, true)
      
      if (onModeChange) {
        onModeChange(newMode as typeof mode)
      }
    } catch (err) {
      console.error('Failed to update mode:', err)
      const data = await getMappingMode()
      setMode((data.mode as typeof mode) || 'heuristic')
    }
  }

  const handlePopoverClose = () => {
    setAnchorEl(null)
  }

  const goToSettings = () => {
    navigate('/settings')
  }

  const getModeIcon = (modeValue: string) => {
    switch (modeValue) {
      case 'heuristic':
        return <Speed fontSize="small" />
      case 'gemini':
        return <Psychology fontSize="small" />
      case 'auto':
        return <AutoAwesome fontSize="small" />
      default:
        return null
    }
  }

  const getModeDescription = (modeValue: string) => {
    switch (modeValue) {
      case 'heuristic':
        return 'Fast pattern-based mapping'
      case 'gemini':
        return 'Provider-backed mapping'
      case 'auto':
        return 'Automatically choose best method'
      default:
        return ''
    }
  }

  if (loading) {
    return <CircularProgress size={20} />
  }

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={getModeIcon(mode)}
          label={mode.charAt(0).toUpperCase() + mode.slice(1)}
          color={mode === 'heuristic' ? 'default' : 'primary'}
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        />
        {apiConfigured && <CheckCircle fontSize="small" color="success" />}
        
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Paper sx={{ p: 2, maxWidth: 300 }}>
            <Typography variant="subtitle2" gutterBottom>
              Mapping Mode
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="heuristic">
                <Tooltip title="Fast pattern-based mapping">
                  <Speed />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="gemini" disabled={!apiConfigured}>
                <Tooltip title="Provider-backed mapping">
                  <Psychology />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="auto" disabled={!apiConfigured}>
                <Tooltip title="Auto-select best method">
                  <AutoAwesome />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            
            {!apiConfigured && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info fontSize="small" color="warning" />
                <Typography variant="caption" color="text.secondary">
                  API key required for provider-backed modes
                </Typography>
                <IconButton size="small" onClick={goToSettings}>
                  <Settings fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Paper>
        </Popover>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle2">Mapping Mode:</Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size="small"
      >
        <ToggleButton value="heuristic">
          <Tooltip title={getModeDescription('heuristic')}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Speed fontSize="small" />
              <Typography variant="body2">Heuristic</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="gemini" disabled={!apiConfigured}>
          <Tooltip title={apiConfigured ? getModeDescription('gemini') : 'API key required'}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Psychology fontSize="small" />
              <Typography variant="body2">Gemini</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="auto" disabled={!apiConfigured}>
          <Tooltip title={apiConfigured ? getModeDescription('auto') : 'API key required'}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AutoAwesome fontSize="small" />
              <Typography variant="body2">Auto</Typography>
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
      
      {apiConfigured ? (
        <Tooltip title="AI configured">
          <CheckCircle fontSize="small" color="success" />
        </Tooltip>
      ) : (
        <Tooltip title="Configure AI settings">
          <IconButton size="small" onClick={goToSettings}>
            <Settings fontSize="small" color="warning" />
          </IconButton>
        </Tooltip>
      )}
      
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2">
            Provider-backed modes require a Gemini API key.
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ cursor: 'pointer' }}
              onClick={goToSettings}
            >
              Go to Settings →
            </Typography>
          </Box>
        </Paper>
      </Popover>
    </Box>
  )
}

export default MappingModeToggle
