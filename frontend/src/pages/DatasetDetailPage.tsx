import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LinkIcon from '@mui/icons-material/Link'
import MergeIcon from '@mui/icons-material/MergeType'
import WarningIcon from '@mui/icons-material/Warning'
import {
Alert,
Box,
Button,
Card,
CardContent,
Chip,
Dialog,
DialogActions,
DialogContent,
DialogTitle,
FormControl,
Grid,
IconButton,
InputLabel,
LinearProgress,
List,
ListItem,
ListItemIcon,
ListItemText,
MenuItem,
Paper,
Select,
Stack,
Typography
} from '@mui/material'
import { useEffect,useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { getDataset,getFileQualityReport,mergeFiles } from '../services/api'
// Define types locally since shared types are not accessible
interface DataSet {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  files: FileUpload[];
  totalRecords: number;
  createdAt: string;
  relationships?: DataRelationship[];
}

interface FileUpload {
  id: string;
  originalName: string;
  size: string | number;
  recordCount?: number;
  status: string;
  qualityScore?: number;
  headers?: string[];
}

interface DataRelationship {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
}

interface DataQualityReport {
  fileId: string;
  overallScore: number;
  issues: any[];
  duplicates: number;
  anomalies: any[];
}

const DatasetDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [dataset, setDataset] = useState<DataSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeStrategy, setMergeStrategy] = useState<'keep_first' | 'keep_last' | 'merge'>('keep_first')
  const [keyColumns, setKeyColumns] = useState<string[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [qualityReports, setQualityReports] = useState<Map<string, DataQualityReport>>(new Map())

  useEffect(() => {
    if (id) {
      fetchDataset()
    }
  }, [id])

  const fetchDataset = async () => {
    try {
      setLoading(true)
      const data = await getDataset(id || '')
      const transformedData: DataSet = {
        ...data,
        totalRecords: data.total_records || data.totalRecords || 0,
        createdAt: data.created_at || data.createdAt || '',
        files: (data.files || []).map((file: any) => ({
          ...file,
          originalName: file.original_name || file.originalName || '',
          recordCount: file.record_count || file.recordCount,
          qualityScore: file.quality_score || file.qualityScore,
        })),
        relationships: (data.relationships || []).map((rel: any) => ({
          ...rel,
          sourceFileId: rel.source_file_id || rel.sourceFileId || '',
          targetFileId: rel.target_file_id || rel.targetFileId || '',
          sourceColumn: rel.source_column || rel.sourceColumn || '',
          targetColumn: rel.target_column || rel.targetColumn || '',
        })),
      }
      setDataset(transformedData)
      
      // Fetch quality reports for each file
      const reports = new Map<string, DataQualityReport>()
      for (const file of transformedData.files) {
        try {
          const report = await getFileQualityReport(file.id)
          reports.set(file.id, report as DataQualityReport)
        } catch {
          console.error(`Failed to fetch quality report for file ${file.id}`)
        }
      }
      setQualityReports(reports)
    } catch (error) {
      showNotification('Failed to load dataset', 'error')
      console.error('Error fetching dataset:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getQualityColor = (score: number | null | undefined) => {
    if (!score) return 'default'
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />
      case 'failed':
        return <ErrorIcon color="error" />
      default:
        return <WarningIcon color="warning" />
    }
  }

  const handleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId)
      }
      return [...prev, fileId]
    })
  }

  const handleOpenMergeDialog = () => {
    if (selectedFiles.length < 2) {
      showNotification('Please select at least 2 files to merge', 'warning')
      return
    }

    // Get common columns from selected files
    const filesData = dataset?.files.filter(f => selectedFiles.includes(f.id)) || []
    if (filesData.length > 0) {
      const commonCols = filesData[0].headers?.filter(col =>
        filesData.every(file => file.headers?.includes(col))
      ) || []
      setAvailableColumns(commonCols)
    }

    setMergeDialogOpen(true)
  }

  const handleMergeFiles = async () => {
    try {
      const response = await mergeFiles(selectedFiles, mergeStrategy, keyColumns)

      showNotification(response.message || 'Files merged', 'success')
      setMergeDialogOpen(false)
      setSelectedFiles([])
    } catch (error) {
      showNotification('Failed to merge files', 'error')
      console.error('Error merging files:', error)
    }
  }

  const renderRelationships = (relationships: DataRelationship[]) => {
    if (!relationships || relationships.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No relationships detected
        </Typography>
      )
    }

    const fileMap = new Map(dataset?.files.map(f => [f.id, f.originalName]) || [])

    return (
      <List dense>
        {relationships.map(rel => (
          <ListItem key={rel.id}>
            <ListItemIcon>
              <LinkIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2">
                  {fileMap.get(rel.sourceFileId) || 'Unknown'}{' -> '}{fileMap.get(rel.targetFileId) || 'Unknown'}
                </Typography>
              }
              secondary={
                <Typography variant="caption">
                  {rel.sourceColumn}{' <-> '}{rel.targetColumn} ({(rel.confidence * 100).toFixed(0)}% confidence)
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    )
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    )
  }

  if (!dataset) {
    return (
      <Alert severity="error">Dataset not found</Alert>
    )
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/datasets')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {dataset.name}
        </Typography>
        <Chip label={dataset.category} color="primary" />
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Files in Dataset
            </Typography>
            
            <Stack spacing={2}>
              {dataset.files.map((file) => {
                const qualityReport = qualityReports.get(file.id)
                const isSelected = selectedFiles.includes(file.id)
                
                return (
                  <Card
                    key={file.id}
                    sx={{
                      cursor: 'pointer',
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                    }}
                    onClick={() => handleFileSelection(file.id)}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <InsertDriveFileIcon />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">
                            {file.originalName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(Number(file.size))} - {file.recordCount || 0} records
                          </Typography>
                        </Box>
                        {getFileStatusIcon(file.status)}
                        {file.qualityScore && (
                          <Chip
                            label={`Quality: ${file.qualityScore.toFixed(0)}%`}
                            size="small"
                            color={getQualityColor(file.qualityScore) as any}
                          />
                        )}
                      </Stack>
                      
                      {qualityReport && qualityReport.issues.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="warning.main">
                            {qualityReport.issues.length} quality issues found
                          </Typography>
                        </Box>
                      )}
                      
                      {file.headers && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Columns: {file.headers.slice(0, 5).join(', ')}
                            {file.headers.length > 5 && ` +${file.headers.length - 5} more`}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>

            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<MergeIcon />}
                  onClick={handleOpenMergeDialog}
                  disabled={selectedFiles.length < 2}
                >
                  Merge Selected Files ({selectedFiles.length})
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dataset Information
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Records
                </Typography>
                <Typography variant="h5">
                  {dataset.totalRecords.toLocaleString()}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created
                </Typography>
                <Typography>
                  {formatDate(dataset.createdAt)}
                </Typography>
              </Box>
              
              {dataset.tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {dataset.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Detected Relationships
            </Typography>
            {renderRelationships(dataset.relationships || [])}
          </Paper>
        </Grid>
      </Grid>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge Files</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Merge Strategy</InputLabel>
              <Select
                value={mergeStrategy}
                onChange={(e) => setMergeStrategy(e.target.value as any)}
              >
                <MenuItem value="keep_first">Keep First (ignore duplicates)</MenuItem>
                <MenuItem value="keep_last">Keep Last (overwrite duplicates)</MenuItem>
                <MenuItem value="merge">Merge (combine non-null values)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Key Columns</InputLabel>
              <Select
                multiple
                value={keyColumns}
                onChange={(e) => setKeyColumns(e.target.value as string[])}
              >
                {availableColumns.map(col => (
                  <MenuItem key={col} value={col}>
                    {col}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleMergeFiles}
            variant="contained"
            disabled={keyColumns.length === 0}
          >
            Merge Files
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DatasetDetailPage
