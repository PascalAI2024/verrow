import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ErrorIcon from '@mui/icons-material/Error'
import FolderIcon from '@mui/icons-material/Folder'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import LinkIcon from '@mui/icons-material/Link'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
Box,
Button,
Chip,
FormControl,
IconButton,
InputLabel,
LinearProgress,
MenuItem,
Paper,
Select,
Stack,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TablePagination,
TableRow,
Tooltip,
Typography
} from '@mui/material'
import { useEffect,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { getDatasets } from '../services/api'
// Define types locally since shared types are not accessible
interface DataSet {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  files: FileUpload[];
  total_records: number;
  created_at: string;
  _count?: {
    relationships: number;
  };
}

interface FileUpload {
  id: string;
  original_name: string;
  status: string;
  quality_score?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

const DatasetsPage = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [datasets, setDatasets] = useState<DataSet[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const categories = [
    '',
    'general',
    'customer',
    'product',
    'sales',
    'financial',
    'employee',
    'location',
  ]

  useEffect(() => {
    fetchDatasets()
  }, [page, rowsPerPage, categoryFilter])

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const response = await getDatasets(page + 1, rowsPerPage, categoryFilter || undefined) as PaginatedResponse<DataSet>
      setDatasets(response.data)
      setTotalCount(response.meta.total)
    } catch (error) {
      showNotification('Failed to load datasets', 'error')
      console.error('Error fetching datasets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />
      case 'processing':
      case 'pending':
        return <HourglassEmptyIcon color="warning" fontSize="small" />
      default:
        return null
    }
  }

  if (loading && datasets.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Datasets
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate('/upload')}
          >
            New Dataset
          </Button>
        </Stack>
      </Stack>

      {datasets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No datasets found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload CSV files to create your first dataset
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Files
          </Button>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Dataset Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="center">Files</TableCell>
                  <TableCell align="center">Total Records</TableCell>
                  <TableCell align="center">Relationships</TableCell>
                  <TableCell>Tags</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{dataset.name}</Typography>
                      {dataset.description && (
                        <Typography variant="caption" color="text.secondary">
                          {dataset.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={dataset.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                        {dataset.files.slice(0, 3).map((file) => (
                          <Tooltip
                            key={file.id}
                            title={`${file.original_name} - Quality: ${file.quality_score?.toFixed(0) || 'N/A'}%`}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <InsertDriveFileIcon fontSize="small" />
                              {getFileStatusIcon(file.status)}
                            </Box>
                          </Tooltip>
                        ))}
                        {dataset.files.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{dataset.files.length - 3}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {dataset.total_records.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      {dataset._count?.relationships > 0 && (
                        <Chip
                          icon={<LinkIcon />}
                          label={dataset._count.relationships}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {dataset.tags.slice(0, 2).map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                        {dataset.tags.length > 2 && (
                          <Chip
                            label={`+${dataset.tags.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(dataset.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/datasets/${dataset.id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  )
}

export default DatasetsPage
