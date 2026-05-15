import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchIcon from '@mui/icons-material/Search'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
Alert,
Box,
Button,
Checkbox,
Chip,
Dialog,
DialogActions,
DialogContent,
DialogTitle,
Divider,
Fade,
FormControl,
FormControlLabel,
FormLabel,
Grid,
IconButton,
List,
ListItem,
ListItemIcon,
ListItemText,
Menu,
MenuItem,
Paper,
Popover,
Radio,
RadioGroup,
Skeleton,
Snackbar,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TablePagination,
TableRow,
TextField,
Tooltip,
Typography,
Zoom,
} from '@mui/material'
import { useEffect,useState } from 'react'
import EmptyState from '../components/EmptyState'
import PipelineStatusChip from '../components/PipelineStatusChip'
import { DataRecord,deleteDataRecord,queryData } from '../services/api'

const DataPage = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DataRecord[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<Record<string, string>>({
    business_name: '',
    first_name: '',
    last_name: '',
    email: '',
    city: '',
    state: '',
    industry: '',
    country: '',
  })
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current')
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Filter out empty filters
      const activeFilters: Record<string, string> = {}
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          activeFilters[key] = value.trim()
        }
      })

      const result = await queryData(page + 1, rowsPerPage, activeFilters)

      setData(result.data)
      setTotalCount(result.meta.total)
    } catch (err) {
      setError('Failed to fetch data. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, rowsPerPage])

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSearch = () => {
    setPage(0)
    fetchData()
  }

  const handleClearFilters = async () => {
    const clearedFilters = {
      business_name: '',
      first_name: '',
      last_name: '',
      email: '',
      city: '',
      state: '',
      industry: '',
      country: '',
    }
    setFilters(clearedFilters)
    setPage(0)
    
    // Fetch data with cleared filters directly
    try {
      setLoading(true)
      setError(null)
      const result = await queryData(1, rowsPerPage, {})
      setData(result.data)
      setTotalCount(result.meta.total)
    } catch (err) {
      setError('Failed to fetch data. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportClick = () => {
    setExportDialogOpen(true)
  }

  const handleExportClose = () => {
    setExportDialogOpen(false)
  }

  const handleExport = async () => {
    try {
      // Determine what data to export
      let exportData: DataRecord[] = []
      
      if (exportScope === 'current') {
        // Export current page data
        exportData = data
      } else {
        // Export all data with current filters
        const activeFilters: Record<string, string> = {}
        Object.entries(filters).forEach(([key, value]) => {
          if (value.trim()) {
            activeFilters[key] = value.trim()
          }
        })
        
        const allData = await queryData(1, totalCount, activeFilters)
        exportData = allData.data
      }

      // Get visible columns for export (excluding actions)
      const exportColumns = columns.filter(col => col.id !== 'actions')
      
      if (exportFormat === 'csv') {
        // Convert data to CSV
        const headers = exportColumns.map(col => col.label).join(',')
        const rows = exportData.map(row =>
          exportColumns.map(col => {
            // Escape commas and quotes
            const value = row[col.id] || ''
            const escaped = typeof value === 'string' ? value.replace(/"/g, '""') : value
            return `"${escaped}"`
          }).join(',')
        )
        const csv = [headers, ...rows].join('\n')

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `data_export_${exportScope}_${new Date().toISOString().slice(0, 10)}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // Export as JSON
        const json = JSON.stringify(exportData, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `data_export_${exportScope}_${new Date().toISOString().slice(0, 10)}.json`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setSnackbarMessage(`Exported ${exportData.length} records successfully!`)
      setSnackbarOpen(true)
    } catch (err) {
      console.error('Export failed:', err)
      setSnackbarMessage('Export failed. Please try again.')
      setSnackbarOpen(true)
    }

    handleExportClose()
  }

  const handleViewDetails = (record: DataRecord) => {
    setSelectedRecord(record)
    setDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsOpen(false)
  }

  const allColumns = [
    { id: 'business_name', label: 'Business Name', defaultVisible: true },
    { id: 'first_name', label: 'First Name', defaultVisible: true },
    { id: 'last_name', label: 'Last Name', defaultVisible: true },
    { id: 'contact_name', label: 'Contact Name', defaultVisible: false },
    { id: 'contact_title', label: 'Contact Title', defaultVisible: false },
    { id: 'email', label: 'Email', defaultVisible: true },
    { id: 'phone', label: 'Phone', defaultVisible: true },
    { id: 'address', label: 'Address', defaultVisible: false },
    { id: 'city', label: 'City', defaultVisible: true },
    { id: 'state', label: 'State', defaultVisible: true },
    { id: 'zip_code', label: 'Zip Code', defaultVisible: false },
    { id: 'country', label: 'Country', defaultVisible: false },
    { id: 'website', label: 'Website', defaultVisible: false },
    { id: 'industry', label: 'Industry', defaultVisible: true },
    { id: 'employee_count', label: 'Employees', defaultVisible: false },
    { id: 'annual_revenue', label: 'Annual Revenue', defaultVisible: false },
    { id: 'founded_year', label: 'Founded', defaultVisible: false },
    { id: 'actions', label: 'Actions', defaultVisible: true, alwaysVisible: true },
  ]

  // Initialize visible columns and order from localStorage or defaults
  useEffect(() => {
    const savedColumns = localStorage.getItem('dataPageVisibleColumns')
    const savedOrder = localStorage.getItem('dataPageColumnOrder')
    
    if (savedColumns) {
      setVisibleColumns(new Set(JSON.parse(savedColumns)))
    } else {
      // Set default visible columns
      const defaultVisible = allColumns
        .filter(col => col.defaultVisible)
        .map(col => col.id)
      setVisibleColumns(new Set(defaultVisible))
    }
    
    if (savedOrder) {
      setColumnOrder(JSON.parse(savedOrder))
    } else {
      // Set default column order with first_name, last_name, phone first
      const priorityColumns = ['first_name', 'last_name', 'phone']
      const otherColumns = allColumns
        .map(col => col.id)
        .filter(id => !priorityColumns.includes(id))
      setColumnOrder([...priorityColumns, ...otherColumns])
    }
  }, [])

  // Filter and order columns based on visibility and custom order
  const columns = columnOrder
    .filter(colId => visibleColumns.has(colId))
    .map(colId => allColumns.find(col => col.id === colId))
    .filter(Boolean) as typeof allColumns

  // Get active filters count
  const activeFilterCount = Object.values(filters).filter(v => v.trim() !== '').length

  const handleColumnMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColumnMenuAnchor(event.currentTarget)
  }

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null)
  }

  const handleColumnToggle = (columnId: string) => {
    const column = allColumns.find(col => col.id === columnId)
    if (column?.alwaysVisible) return // Don't allow toggling always visible columns
    
    const newVisibleColumns = new Set(visibleColumns)
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId)
    } else {
      newVisibleColumns.add(columnId)
    }
    setVisibleColumns(newVisibleColumns)
    
    // Save to localStorage
    localStorage.setItem('dataPageVisibleColumns', JSON.stringify(Array.from(newVisibleColumns)))
  }

  const handleShowAllColumns = () => {
    const allIds = allColumns.map(col => col.id)
    setVisibleColumns(new Set(allIds))
    localStorage.setItem('dataPageVisibleColumns', JSON.stringify(allIds))
  }

  const handleShowDefaultColumns = () => {
    const defaultVisible = allColumns
      .filter(col => col.defaultVisible)
      .map(col => col.id)
    setVisibleColumns(new Set(defaultVisible))
    localStorage.setItem('dataPageVisibleColumns', JSON.stringify(defaultVisible))
    
    // Also reset column order with first_name, last_name, phone first
    const priorityColumns = ['first_name', 'last_name', 'phone']
    const otherColumns = allColumns
      .map(col => col.id)
      .filter(id => !priorityColumns.includes(id))
    const defaultOrder = [...priorityColumns, ...otherColumns]
    setColumnOrder(defaultOrder)
    localStorage.setItem('dataPageColumnOrder', JSON.stringify(defaultOrder))
  }

  const handleRowMenuOpen = (event: React.MouseEvent<HTMLElement>, rowId: string) => {
    event.stopPropagation()
    setRowMenuAnchor(event.currentTarget)
    setSelectedRowId(rowId)
  }

  const handleRowMenuClose = () => {
    setRowMenuAnchor(null)
    setSelectedRowId(null)
  }

  const handleRowAction = async (action: string) => {
    const record = data.find(r => r.id === selectedRowId)
    if (!record) return

    switch (action) {
      case 'view':
        handleViewDetails(record)
        break
      case 'delete':
        if (!window.confirm('Delete this record? This cannot be undone.')) {
          break
        }
        try {
          await deleteDataRecord(record.id)
          setSnackbarMessage('Record deleted')
          setSnackbarOpen(true)
          await fetchData()
        } catch (error) {
          setSnackbarMessage('Failed to delete record')
          setSnackbarOpen(true)
          console.error(error)
        }
        break
    }
    handleRowMenuClose()
  }

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only clear if we're leaving the cell entirely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDragOverColumn(null)
      return
    }

    const newOrder = [...columnOrder]
    const draggedIndex = newOrder.indexOf(draggedColumn)
    const targetIndex = newOrder.indexOf(targetColumnId)

    // Remove dragged column from its position
    newOrder.splice(draggedIndex, 1)
    // Insert it at the target position
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
    localStorage.setItem('dataPageColumnOrder', JSON.stringify(newOrder))
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Data Explorer
          </Typography>
          <PipelineStatusChip />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Manage columns">
            <Button
              variant="outlined"
              startIcon={<ViewColumnIcon />}
              onClick={handleColumnMenuOpen}
            >
              Columns ({visibleColumns.size}/{allColumns.length - 1})
            </Button>
          </Tooltip>

          <Tooltip title="Export data">
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportClick}
            >
              Export
            </Button>
          </Tooltip>

          {/* Export Dialog */}
          <Dialog
            open={exportDialogOpen}
            onClose={handleExportClose}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Export Data</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend">Export Scope</FormLabel>
                  <RadioGroup
                    value={exportScope}
                    onChange={(e) => setExportScope(e.target.value as 'current' | 'all')}
                  >
                    <FormControlLabel 
                      value="current" 
                      control={<Radio />} 
                      label={`Current page (${data.length} records)`}
                    />
                    <FormControlLabel 
                      value="all" 
                      control={<Radio />} 
                      label={`All results (${totalCount} records)`}
                    />
                  </RadioGroup>
                </FormControl>

                <FormControl component="fieldset">
                  <FormLabel component="legend">Export Format</FormLabel>
                  <RadioGroup
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                  >
                    <FormControlLabel 
                      value="csv" 
                      control={<Radio />} 
                      label="CSV (Excel compatible)"
                    />
                    <FormControlLabel 
                      value="json" 
                      control={<Radio />} 
                      label="JSON"
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleExportClose}>Cancel</Button>
              <Button onClick={handleExport} variant="contained" startIcon={<FileDownloadIcon />}>
                Export
              </Button>
            </DialogActions>
          </Dialog>

          {/* Row Actions Menu */}
          <Menu
            anchorEl={rowMenuAnchor}
            open={Boolean(rowMenuAnchor)}
            onClose={handleRowMenuClose}
            slots={{ transition: Fade }}
          >
            <MenuItem onClick={() => handleRowAction('view')}>
              <ListItemIcon>
                <VisibilityIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View Details</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleRowAction('delete')}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>

          <Popover
            open={Boolean(columnMenuAnchor)}
            anchorEl={columnMenuAnchor}
            onClose={handleColumnMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ p: 2, width: 300 }}>
              <Typography variant="h6" gutterBottom>
                Manage Columns
              </Typography>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={handleShowAllColumns}>
                  Show All
                </Button>
                <Button size="small" onClick={handleShowDefaultColumns}>
                  Reset to Default
                </Button>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                {columnOrder
                  .map(colId => allColumns.find(col => col.id === colId))
                  .filter(Boolean)
                  .filter(col => col!.id !== 'actions' || !col!.alwaysVisible)
                  .map((column) => (
                    <ListItem 
                      key={column!.id} 
                      disablePadding
                      draggable={!column!.alwaysVisible}
                      onDragStart={(e) => handleDragStart(e, column!.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column!.id)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        cursor: column!.alwaysVisible ? 'default' : 'move',
                        backgroundColor: draggedColumn === column!.id ? 'action.hover' : 'transparent',
                        '&:hover': {
                          backgroundColor: column!.alwaysVisible ? 'transparent' : 'action.hover'
                        }
                      }}
                    >
                      {!column!.alwaysVisible && (
                        <ListItemIcon sx={{ minWidth: 24, cursor: 'move' }}>
                          <DragIndicatorIcon fontSize="small" color="action" />
                        </ListItemIcon>
                      )}
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={visibleColumns.has(column!.id)}
                          onChange={() => handleColumnToggle(column!.id)}
                          disabled={column!.alwaysVisible}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={column!.label}
                        secondary={column!.alwaysVisible ? 'Always visible' : null}
                      />
                    </ListItem>
                  ))}
              </List>
            </Box>
          </Popover>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      <Zoom in={true} style={{ transitionDelay: '150ms' }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Filters
              {activeFilterCount > 0 && (
                <Chip
                  size="small"
                  label={activeFilterCount}
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Business Name"
                fullWidth
                value={filters.business_name}
                onChange={(e) => handleFilterChange('business_name', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="First Name"
                fullWidth
                value={filters.first_name}
                onChange={(e) => handleFilterChange('first_name', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Last Name"
                fullWidth
                value={filters.last_name}
                onChange={(e) => handleFilterChange('last_name', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Email"
                fullWidth
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="City"
                fullWidth
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="State"
                fullWidth
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Industry"
                fullWidth
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Country"
                fullWidth
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
            >
              Clear Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
          </Box>
        </Paper>
      </Zoom>

      <Zoom in={true} style={{ transitionDelay: '300ms' }}>
        <Paper>
          <TableContainer sx={{ maxHeight: 620, pl: 2, overflowX: 'auto' }}>
            <Table stickyHeader size={visibleColumns.size > 10 ? 'small' : 'medium'}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id}
                      draggable={column.id !== 'actions'}
                      onDragStart={(e) => column.id !== 'actions' && handleDragStart(e, column.id)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => column.id !== 'actions' && handleDragEnter(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => column.id !== 'actions' && handleDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      sx={{ 
                        minWidth: column.id === 'actions' ? 80 : 150,
                        cursor: column.id !== 'actions' ? 'move' : 'default',
                        position: 'relative',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': column.id !== 'actions' ? {
                          backgroundColor: 'action.hover',
                        } : {},
                        '&[draggable="true"]:active': {
                          opacity: 0.5,
                        },
                        ...(column.id === 'actions' && {
                          position: 'sticky',
                          right: 0,
                          backgroundColor: 'background.paper',
                          zIndex: 1,
                          boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)',
                        }),
                        ...(draggedColumn === column.id && {
                          opacity: 0.5,
                          backgroundColor: 'action.selected',
                        }),
                        ...(dragOverColumn === column.id && draggedColumn && draggedColumn !== column.id && {
                          borderLeft: '3px solid',
                          borderLeftColor: 'primary.main',
                          backgroundColor: 'action.hover',
                        })
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {column.id !== 'actions' && (
                          <Tooltip title="Drag to reorder columns" placement="top">
                            <DragIndicatorIcon 
                              sx={{ 
                                fontSize: 16, 
                                color: 'text.secondary',
                                opacity: 0.6,
                                '&:hover': {
                                  opacity: 1,
                                }
                              }} 
                            />
                          </Tooltip>
                        )}
                        {column.label}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Display skeleton rows while loading
                  Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {columns.map((column) => (
                        <TableCell 
                          key={`${column.id}-skeleton-${index}`}
                          sx={{
                            ...(column.id === 'actions' && {
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)',
                            })
                          }}
                        >
                          {column.id === 'actions' ? (
                            <Skeleton variant="circular" width={24} height={24} />
                          ) : (
                            <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ py: 0 }}>
                      <EmptyState
                        icon={<SearchIcon />}
                        title={activeFilterCount > 0 ? 'No matching records' : 'No records yet'}
                        description={activeFilterCount > 0 ? 'Adjust or clear filters to broaden the result set.' : 'Processed CSV records will appear here.'}
                        actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
                        onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
                        minHeight={240}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          cursor: 'pointer',
                        },
                      }}
                    >
                      {columns.map((column) => {
                        if (column.id === 'actions') {
                          return (
                            <TableCell 
                              key={column.id}
                              sx={{
                                position: 'sticky',
                                right: 0,
                                backgroundColor: 'background.paper',
                                zIndex: 1,
                                boxShadow: '-2px 0 5px -2px rgba(0,0,0,0.1)',
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={(e) => handleRowMenuOpen(e, row.id)}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell
                            key={column.id}
                            onClick={() => handleViewDetails(row)}
                          >
                            {row[column.id] || '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Zoom>

      {/* Record Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRecord?.business_name || selectedRecord?.first_name && selectedRecord?.last_name ? 
            `${selectedRecord.first_name} ${selectedRecord.last_name}` : 'Record Details'}
        </DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <Grid container spacing={2}>
              {/* Business Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>Business Information</Typography>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Business Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.business_name || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Industry</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.industry || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Founded Year</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.founded_year || '-'}</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Employee Count</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.employee_count ? selectedRecord.employee_count.toLocaleString() : '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Annual Revenue</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRecord.annual_revenue ? `$${Number(selectedRecord.annual_revenue).toLocaleString()}` : '-'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">Website</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRecord.website ? (
                    <a href={selectedRecord.website} target="_blank" rel="noopener noreferrer">
                      {selectedRecord.website}
                    </a>
                  ) : '-'}
                </Typography>
              </Grid>

              {/* Contact Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Contact Information</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.first_name || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.last_name || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Contact Name</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.contact_name || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Contact Title</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.contact_title || '-'}</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRecord.email ? (
                    <a href={`mailto:${selectedRecord.email}`}>{selectedRecord.email}</a>
                  ) : '-'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">Additional Emails</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.additional_emails || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.phone || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Additional Phones</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.additional_phones || '-'}</Typography>
              </Grid>

              {/* Location Information */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Location Information</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.address || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">City</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.city || '-'}</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">State</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.state || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Zip Code</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.zip_code || '-'}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Country</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.country || '-'}</Typography>
              </Grid>

              {/* Description */}
              {selectedRecord.description && (
                <Grid size={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Description</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{selectedRecord.description}</Typography>
                </Grid>
              )}

              {/* Metadata */}
              <Grid size={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Metadata</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Record ID</Typography>
                <Typography variant="body1" gutterBottom sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedRecord.id || '-'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">Source File</Typography>
                <Typography variant="body1" gutterBottom>{selectedRecord.source_file || '-'}</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Batch ID</Typography>
                <Typography variant="body1" gutterBottom sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {selectedRecord.batch_id || '-'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString() : '-'}
                </Typography>
              </Grid>

              {selectedRecord.additional_data && Object.keys(selectedRecord.additional_data).length > 0 && (
                <Grid size={12}>
                  <Typography variant="subtitle2" color="text.secondary">Additional Data</Typography>
                  <Box sx={{ mt: 1 }}>
                    {Object.entries(selectedRecord.additional_data).map(([key, value]) => (
                      <Box key={key} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">{key}</Typography>
                        <Typography variant="body2">{String(value || '-')}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
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

export default DataPage
