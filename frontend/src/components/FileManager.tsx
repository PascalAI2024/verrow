import {
Delete as DeleteIcon,
GetApp as DownloadIcon,
ContentCopy as DuplicateIcon,
Error as ErrorIcon,
InsertDriveFile as FileIcon,
FolderOpen as FolderIcon,
HourglassEmpty,
Merge as MergeIcon,
MoreVert as MoreIcon,
HourglassEmpty as ProcessingIcon,
Edit as RenameIcon,
SelectAll as SelectAllIcon,
CheckCircle as SuccessIcon,
Visibility as ViewIcon,
} from '@mui/icons-material';
import {
Alert,
alpha,
Box,
Button,
Card,
CardContent,
Checkbox,
Chip,
CircularProgress,
Dialog,
DialogActions,
DialogContent,
DialogTitle,
Divider,
Fade,
Grid,
IconButton,
LinearProgress,
List,
ListItemButton,
ListItemIcon,
ListItemSecondaryAction,
ListItemText,
Menu,
MenuItem,
Paper,
Snackbar,
TextField,
Toolbar,
Tooltip,
Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import React,{ useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadFile,duplicateFile,listFiles } from '../services/api';
import EmptyState from './EmptyState';

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  size: number;
  uploadDate: Date;
  status: 'processing' | 'completed' | 'failed' | 'pending_mapping';
  recordCount?: number;
  columnCount?: number;
  error?: string;
  jobId?: string;
}

interface FileManagerProps {
  onFileSelect?: (fileId: string) => void;
  onFilesUpload?: (files: File[]) => void;
  selectedFiles?: string[];
  multiSelect?: boolean;
  previewMode?: boolean;
  previewLimit?: number;
}

const FileManager: React.FC<FileManagerProps> = ({
  onFileSelect,
  onFilesUpload,
  selectedFiles = [],
  multiSelect = false,
  previewMode = false,
  previewLimit = 5,
}) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedFiles));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuFile, setContextMenuFile] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Helper function to show snackbar messages
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fetch files from API
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await listFiles(1, 50); // Get up to 50 files
      const transformedFiles = response.files.map(file => ({
        ...file,
        uploadDate: new Date(file.uploadDate),
      }));
      setFiles(transformedFiles);
    } catch (error: any) {
      showSnackbar(error.userMessage || 'Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSelect = (fileId: string) => {
    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      setSelected(newSelected);
    } else {
      setSelected(new Set([fileId]));
      if (onFileSelect) {
        onFileSelect(fileId);
      }
    }
  };

  const handleSelectAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map(f => f.id)));
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, fileId: string) => {
    setAnchorEl(event.currentTarget);
    setContextMenuFile(fileId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setContextMenuFile(null);
  };

  const handleRename = () => {
    const file = files.find(f => f.id === contextMenuFile);
    if (file) {
      setNewFileName(file.name);
      setRenameDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
    handleCloseMenu();
  };

  const handleView = () => {
    if (contextMenuFile) {
      navigate(`/data?fileId=${contextMenuFile}`);
    }
    handleCloseMenu();
  };

  const handleMerge = () => {
    setMergeDialogOpen(true);
    handleCloseMenu();
  };

  const handleDuplicate = async () => {
    if (!contextMenuFile) return;
    
    handleCloseMenu();
    setDuplicating(true);
    
    try {
      const response = await duplicateFile(contextMenuFile);
      
      // Add the duplicated file to the files list
      const duplicatedFile: FileItem = {
        id: response.file.id,
        name: response.file.name,
        originalName: response.file.originalName,
        size: response.file.size,
        uploadDate: new Date(response.file.uploadDate),
        status: response.file.status as any,
      };
      
      setFiles(prevFiles => [duplicatedFile, ...prevFiles]);
      showSnackbar(`File "${response.file.name}" created successfully`, 'success');
      
      // Optionally refresh the entire list to ensure consistency
      // fetchFiles();
    } catch (error: any) {
      showSnackbar(error.userMessage || 'Failed to duplicate file', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  const handleDownload = async () => {
    if (!contextMenuFile) return;
    
    handleCloseMenu();
    
    try {
      await downloadFile(contextMenuFile);
      showSnackbar('Download started', 'info');
    } catch (error: any) {
      showSnackbar(error.userMessage || 'Failed to download file', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon color="success" />;
      case 'processing':
        return <ProcessingIcon color="info" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'pending_mapping':
        return <HourglassEmpty color="warning" />;
      default:
        return <FileIcon />;
    }
  };

  const getStatusChip = (file: FileItem) => {
    switch (file.status) {
      case 'completed':
        return (
          <Chip
            size="small"
            label={`${file.recordCount?.toLocaleString()} records`}
            color="success"
            variant="outlined"
          />
        );
      case 'processing':
        return <Chip size="small" label="Processing..." color="info" />;
      case 'failed':
        return <Chip size="small" label="Failed" color="error" />;
      case 'pending_mapping':
        return <Chip size="small" label="Awaiting Mapping" color="warning" variant="outlined" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>Loading files...</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Loading overlay for duplication */}
      {duplicating && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Duplicating file...</Typography>
          </Paper>
        </Box>
      )}
      {/* Toolbar */}
      {multiSelect && selected.size > 0 && (
        <Fade in>
          <Paper
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
            }}
          >
            <Toolbar variant="dense" disableGutters>
              <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
                {selected.size} file{selected.size > 1 ? 's' : ''} selected
              </Typography>
              <Tooltip title="Merge files">
                <IconButton onClick={() => setMergeDialogOpen(true)}>
                  <MergeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete selected">
                <IconButton onClick={() => setDeleteConfirmOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </Paper>
        </Fade>
      )}

      {/* File List */}
      <Paper sx={{ overflow: 'hidden' }}>
        {files.length === 0 ? (
          <EmptyState
            icon={<FolderIcon />}
            title="No files uploaded yet"
            description="CSV uploads will appear here with mapping and processing status."
            actionLabel="Upload Files"
            onAction={() => {
                if (onFilesUpload) {
                  // Create a file input element and trigger click
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                      onFilesUpload(Array.from(target.files));
                    }
                  };
                  input.click();
                } else {
                  navigate('/upload');
                }
              }}
          />
        ) : (
          <>
            {multiSelect && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Button
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                >
                  {selected.size === files.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
            )}
            <List>
              {(() => {
                const displayFiles = previewMode 
                  ? files.slice(0, previewLimit) 
                  : files;
                
                return displayFiles.map((file, index) => (
                  <React.Fragment key={file.id}>
                    {index > 0 && <Divider />}
                    <ListItemButton
                      selected={selected.has(file.id)}
                    onClick={() => handleSelect(file.id)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    {multiSelect && (
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selected.has(file.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                    )}
                    <ListItemIcon>{getStatusIcon(file.status)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">{file.name}</Typography>
                          {getStatusChip(file)}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" component="span">
                            {formatFileSize(file.size)} - Uploaded{' '}
                            {formatDistanceToNow(file.uploadDate, { addSuffix: true })}
                          </Typography>
                          {file.columnCount && (
                            <Typography variant="caption" component="span">
                              {' '}
                              - {file.columnCount} columns
                            </Typography>
                          )}
                          {file.error && (
                            <Typography
                              variant="caption"
                              component="div"
                              color="error"
                              sx={{ mt: 0.5 }}
                            >
                              {file.error}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file.id);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                    </ListItemButton>
                </React.Fragment>
              ))})()}
            </List>
            {previewMode && files.length > previewLimit && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing {previewLimit} of {files.length} files
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate} disabled={duplicating}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMerge}>
          <ListItemIcon>
            <MergeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Merge with...</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Rename File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File name"
            fullWidth
            variant="outlined"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setRenameDialogOpen(false)} variant="contained">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete File{selected.size > 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            This action cannot be undone. All data associated with{' '}
            {selected.size > 1 ? 'these files' : 'this file'} will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Merge Files</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select how you want to merge the selected files:
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent>
                  <Typography variant="h6">Append Rows</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stack files vertically, combining all rows
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={12}>
              <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                <CardContent>
                  <Typography variant="h6">Join Columns</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Merge files side by side based on a common key
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileManager;
