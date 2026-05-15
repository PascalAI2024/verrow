import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import {
Alert,
Box,
Button,
Card,
CardContent,
CardHeader,
Chip,
CircularProgress,
Collapse,
Dialog,
DialogActions,
DialogContent,
DialogContentText,
DialogTitle,
Divider,
Fade,
FormControl,
Grid,
IconButton,
InputLabel,
LinearProgress,
MenuItem,
Paper,
Select,
Snackbar,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
Tooltip,
Typography,
Zoom
} from '@mui/material'
import { useEffect,useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'
import MappingModeToggle from '../components/MappingModeToggle'
import { confirmMapping,getMappingSuggestions,Mapping,MappingSuggestion,MappingSuggestionsResponse } from '../services/api'

interface MappingPageProps {
  // This prop will be passed from NewUploadPage to handle post-confirmation logic
  onMappingConfirmed?: (fileId: string, ingestionJobId: string) => void;
}

const MappingPage: React.FC<MappingPageProps> = ({ onMappingConfirmed: _onMappingConfirmed }) => {
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [mappingSuggestions, setMappingSuggestions] = useState<MappingSuggestion[]>([])
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string | null>>({})
  const [sampleData, setSampleData] = useState<any[]>([])
  const [showSampleData, setShowSampleData] = useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const [autoMapDialogOpen, setAutoMapDialogOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const standardColumns = [
    { name: 'business_name', description: 'Name of the business or company' },
    { name: 'first_name', description: 'First name of the contact person' },
    { name: 'last_name', description: 'Last name of the contact person' },
    { name: 'address', description: 'Physical address of the business' },
    { name: 'city', description: 'City where the business is located' },
    { name: 'state', description: 'State or province where the business is located' },
    { name: 'zip_code', description: 'Postal or ZIP code of the business location' },
    { name: 'country', description: 'Country where the business is located' },
    { name: 'phone', description: 'Contact phone number for the business' },
    { name: 'email', description: 'Contact email address for the business' },
    { name: 'additional_emails', description: 'Additional email addresses' },
    { name: 'additional_phones', description: 'Additional phone numbers' },
    { name: 'website', description: 'Website URL of the business' },
    { name: 'industry', description: 'Industry or business category' },
    { name: 'employee_count', description: 'Number of employees at the business' },
    { name: 'annual_revenue', description: 'Annual revenue of the business' },
    { name: 'founded_year', description: 'Year the business was founded' },
    { name: 'description', description: 'Brief description of the business' },
    { name: 'contact_name', description: 'Name of the primary contact person' },
    { name: 'contact_title', description: 'Job title of the primary contact person' },
  ]

  useEffect(() => {
    const fetchMappingSuggestions = async () => {
      if (!fileId) return

      try {
        setLoading(true)
        setError(null)

        const result = await getMappingSuggestions(fileId)

        setHeaders((result as MappingSuggestionsResponse).headers);
        setMappingSuggestions((result as MappingSuggestionsResponse).mappingSuggestions);

        // Set sample data if available
        if ((result as MappingSuggestionsResponse).sampleData) {
            setSampleData((result as MappingSuggestionsResponse).sampleData);
        }

        // Initialize selected mappings with suggestions
        const initialMappings: Record<string, string | null> = {}
        result.mappingSuggestions.forEach((suggestion: MappingSuggestion) => {
          initialMappings[suggestion.sourceColumn] = suggestion.targetColumn
        })

        setSelectedMappings(initialMappings)
      } catch (err) {
        setError('Failed to load mapping suggestions. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMappingSuggestions()
  }, [fileId])

  const handleMappingChange = (sourceColumn: string, targetColumn: string | null) => {
    setSelectedMappings(prev => ({
      ...prev,
      [sourceColumn]: targetColumn,
    }))
  }

  const handleConfirmMapping = async () => {
    if (!fileId) return

    try {
      setLoading(true)

      // Convert selected mappings to the format expected by the API
      const mappings: Mapping[] = Object.entries(selectedMappings)
        .filter(([_, targetColumn]) => targetColumn !== null)
        .map(([sourceColumn, targetColumn]) => ({
          sourceColumn,
          targetColumn: targetColumn as string,
        }))

      const result = await confirmMapping(fileId, mappings) as { jobId: string };

      if (result.jobId) {
        // Instead of onMappingConfirmed prop, navigate with state
        navigate('/upload', {
          replace: true, // Replace history entry so back button doesn't bring user back here
          state: {
            mappedFileId: fileId,
            ingestionJobId: result.jobId
          }
        });
      } else {
         // This case should ideally not happen if the API returns a process receipt.
        setError('Mapping confirmation succeeded but no job ID was returned. Cannot track processing.');
        console.error('No ingestionJobId received from confirmMapping');
      }
    } catch (err: any) {
      setError(err.userMessage || 'Failed to confirm mappings. Please try again.');
      console.error(err);
      // Optionally navigate back with error state if needed, or just show error on this page
      // navigate('/upload', { state: { mappedFileId: fileId, error: err.userMessage || 'Confirm mapping failed' } });
    } finally {
      setLoading(false)
    }
  }

  const handleAutoMap = () => {
    setAutoMapDialogOpen(true)
  }

  const confirmAutoMap = () => {
    // Apply all high-confidence suggestions
    const newMappings = { ...selectedMappings }
    mappingSuggestions.forEach(suggestion => {
      if (suggestion.confidence >= 0.7) {
        newMappings[suggestion.sourceColumn] = suggestion.targetColumn
      }
    })

    setSelectedMappings(newMappings)
    setAutoMapDialogOpen(false)

    setSnackbarMessage('Auto-mapping applied successfully!')
    setSnackbarOpen(true)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.5) return 'warning'
    return 'error'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircleIcon fontSize="small" />
    if (confidence >= 0.5) return <WarningIcon fontSize="small" />
    return <InfoIcon fontSize="small" />
  }

  // Calculate mapping stats
  const totalColumns = mappingSuggestions.length
  const mappedColumns = Object.values(selectedMappings).filter(v => v !== null).length
  const mappingPercentage = totalColumns > 0 ? (mappedColumns / totalColumns) * 100 : 0

  // Group suggestions by confidence
  const highConfidence = mappingSuggestions.filter(s => s.confidence >= 0.8).length
  const mediumConfidence = mappingSuggestions.filter(s => s.confidence >= 0.5 && s.confidence < 0.8).length
  const lowConfidence = mappingSuggestions.filter(s => s.confidence < 0.5).length

  if (loading && headers.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Analyzing your data and generating mapping suggestions...
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Fade in={true}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              Column Mapping
              <Tooltip title="Learn about column mapping">
                <IconButton size="small" onClick={() => setHelpDialogOpen(true)} sx={{ ml: 1 }}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            <MappingModeToggle compact />
          </Box>

          <Typography variant="body1" sx={{ mb: 2 }}>
            Verrow analyzed your headers and sample rows. Review and adjust the suggested mappings before processing.
          </Typography>
        </Box>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Zoom in={true} style={{ transitionDelay: '150ms' }}>
            <Card>
              <CardHeader
                title="Mapping Progress"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={mappingPercentage}
                      color={mappingPercentage === 100 ? "success" : "primary"}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(mappingPercentage)}%`}</Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {mappedColumns} of {totalColumns} columns mapped
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Mapping Confidence Levels</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon />}
                      label={`High: ${highConfidence}`}
                      color="success"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      size="small"
                      icon={<WarningIcon />}
                      label={`Medium: ${mediumConfidence}`}
                      color="warning"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      size="small"
                      icon={<InfoIcon />}
                      label={`Low: ${lowConfidence}`}
                      color="error"
                    />
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleAutoMap}
                    fullWidth
                  >
                    Auto-Map High Confidence Columns
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6">Sample Data Preview</Typography>
                    {sampleData.length > 0 && (
                      <IconButton
                        onClick={() => setShowSampleData(!showSampleData)}
                        aria-expanded={showSampleData}
                        aria-label="show more"
                      >
                        {showSampleData ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>
                }
                titleTypographyProps={{ component: 'div' }}
              />
              <Collapse in={showSampleData}>
                <Divider />
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {headers.map(header => (
                          <TableCell key={header}>{header}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleData.slice(0, 3).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {headers.map(header => (
                            <TableCell key={`${rowIndex}-${header}`}>
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Collapse>
            </Card>
          </Zoom>
        </Grid>
      </Grid>

      <Zoom in={true} style={{ transitionDelay: '450ms' }}>
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Column Mapping Configuration
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Source Column</TableCell>
                  <TableCell>Target Column</TableCell>
                  <TableCell width={120}>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappingSuggestions.map((suggestion) => (
                  <TableRow
                    key={suggestion.sourceColumn}
                    sx={{
                      backgroundColor: selectedMappings[suggestion.sourceColumn]
                        ? 'rgba(25, 118, 210, 0.04)'
                        : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {suggestion.sourceColumn}
                      </Typography>
                      {sampleData.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Sample: {sampleData[0]?.[suggestion.sourceColumn] || '-'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <InputLabel>Target Column</InputLabel>
                        <Select
                          value={selectedMappings[suggestion.sourceColumn] || ''}
                          onChange={(e) => handleMappingChange(suggestion.sourceColumn, e.target.value || null)}
                          label="Target Column"
                          MenuProps={{
                            slotProps: {
                              paper: {
                                style: { maxHeight: 300 }
                              }
                            }
                          }}
                        >
                          <MenuItem value="">
                            <em>Ignore this column</em>
                          </MenuItem>
                          {standardColumns.map((column) => (
                            <MenuItem
                              key={column.name}
                              value={column.name}
                              selected={selectedMappings[suggestion.sourceColumn] === column.name}
                            >
                              <Box>
                                <Typography variant="body2">
                                  {column.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {column.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Chip
                          icon={getConfidenceIcon(suggestion.confidence)}
                          label={`${Math.round(suggestion.confidence * 100)}%`}
                          color={getConfidenceColor(suggestion.confidence) as any}
                          size="small"
                          variant={suggestion.confidence >= 0.8 ? "filled" : "outlined"}
                        />
                        {suggestion.confidence >= 0.8 && (
                          <Tooltip title="High-confidence mapping suggestion">
                            <AutoAwesomeIcon
                              fontSize="small"
                              color="warning"
                              sx={{ ml: 1 }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Zoom>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          // Navigate back to where UnifiedUploader is, or use a more intelligent history back if appropriate
          onClick={() => navigate('/upload')}
        >
          Cancel / Back to Uploads
        </Button>

        <Button
          variant="contained"
          onClick={handleConfirmMapping}
          disabled={loading || mappedColumns === 0}
          startIcon={mappedColumns === totalColumns ? <CheckCircleIcon /> : null}
          color={mappedColumns === totalColumns ? "success" : "primary"}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : mappedColumns === 0 ? (
            'Map Columns to Continue'
          ) : (
            `Confirm Mappings & Process Data (${mappedColumns}/${totalColumns})`
          )}
        </Button>
      </Box>

      {/* Help Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
      >
        <DialogTitle>Understanding Column Mapping</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography sx={{ mb: 2 }}>
              <strong>What is column mapping?</strong> Column mapping is the process of matching columns from your CSV file to our standardized schema. This allows the system to understand and process your data correctly.
            </Typography>

            <Typography sx={{ mb: 2 }}>
              <strong>How does mapping work?</strong> Verrow analyzes column headers and sample values to suggest the most likely target fields. The confidence score indicates how strong each match is.
            </Typography>

            <Typography sx={{ mb: 2 }}>
              <strong>What do the confidence levels mean?</strong>
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip size="small" color="success" label="High (80-100%)" sx={{ mr: 1 }} />
                <Typography variant="body2">Verrow found a strong match for this mapping.</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip size="small" color="warning" label="Medium (50-79%)" sx={{ mr: 1 }} />
                <Typography variant="body2">Verrow found a moderate match. Review it before processing.</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip size="small" color="error" label="Low (0-49%)" sx={{ mr: 1 }} />
                <Typography variant="body2">Verrow found a weak match. Review carefully.</Typography>
              </Box>
            </Box>

            <Typography sx={{ mb: 2 }}>
              <strong>Tips for mapping:</strong>
            </Typography>
            <ul>
              <li>Review all mappings, especially those with medium or low confidence.</li>
              <li>Use the "Auto-Map" button to quickly apply all high-confidence suggestions.</li>
              <li>You can choose to ignore columns that don't fit into our schema.</li>
              <li>Unmapped columns will be stored as additional data but won't be searchable in the standard way.</li>
            </ul>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Map Dialog */}
      <Dialog
        open={autoMapDialogOpen}
        onClose={() => setAutoMapDialogOpen(false)}
      >
        <DialogTitle>Apply Suggestions</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will apply all high-confidence mapping suggestions. You can still review and adjust the mappings afterward.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoMapDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmAutoMap} variant="contained" autoFocus>
            Apply Suggestions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  )
}

export default MappingPage
