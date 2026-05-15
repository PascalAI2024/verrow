import {
ExpandLess as CollapseIcon,
Delete as DeleteIcon,
Error as ErrorIcon,
ExpandMore as ExpandIcon,
InsertDriveFile as FileIcon,
Pause as PauseIcon,
// Warning as WarningIcon, // Not used, can remove
PlayArrow as StartIcon,
CheckCircle as SuccessIcon,
CloudUpload as UploadIcon
} from '@mui/icons-material';
import {
Alert,
alpha,
Box,
Button,
Chip,
CircularProgress,
Collapse,
Dialog,
DialogActions,
DialogContent,
DialogTitle,
Fade,
IconButton,
LinearProgress,
List,
ListItem,
ListItemIcon,
ListItemSecondaryAction,
ListItemText,
Paper,
Stack,
TextField,
Typography,
useTheme,
Zoom,
} from '@mui/material';
import React,{ useCallback,useEffect,useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNotification } from '../contexts/NotificationContext';
import { getJobStatus,uploadFile } from '../services/api';
import PipelineStatusChip from './PipelineStatusChip';

// Define more granular statuses for the unified flow
export type FileUploadStatus =
  | 'pending_selection' // File selected by user, not yet added to queue
  | 'pending_upload'    // File added to queue, waiting for upload to start
  | 'uploading'         // HTTP upload in progress
  | 'processing_suggestions' // Upload complete, API processing for suggestions
  | 'ready_for_mapping' // Mapping suggestions ready, user can confirm mappings
  | 'mapping_confirmed' // User has confirmed mappings, waiting for data ingestion
  | 'processing_data'   // API ingesting data
  | 'completed'         // All processing finished successfully
  | 'failed'            // An error occurred at any stage
  | 'cancelled';        // User cancelled

export interface FileUploadItem {
  id: string; // Unique ID for the item in the list (e.g., timestamp-random)
  file: File;
  status: FileUploadStatus;
  progress: number; // Overall progress for this file (0-100)
  uploadProgress: number; // HTTP upload progress (0-100)
  processingProgress: number; // API processing progress (suggestions or data ingestion) (0-100)
  error?: string;
  jobId?: string; // For polling job status (could be for suggestions or ingestion)
  fileId?: string; // API upload ID for the file
  startTime?: Date;
  endTime?: Date;
  message?: string; // Current status message from the API or frontend
  // mappingSuggestions?: any; // To be added when fetching suggestions
  // confirmedMappings?: any; // To be added after user confirms
}

export interface TriggeredUpdatePayload {
  fileIdToUpdate: string;
  newIngestionJobId: string;
  newStatus: FileUploadStatus;
}
interface UnifiedUploaderProps {
  onUploadComplete?: (completedFiles: FileUploadItem[], datasetMeta?: { name: string; description?: string; tags?: string[] }) => void;
  onFileReadyForMapping?: (fileItem: FileUploadItem) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  triggerFileUpdate?: TriggeredUpdatePayload | null; // New prop to receive updates
}

const UnifiedUploader: React.FC<UnifiedUploaderProps> = ({
  onUploadComplete,
  onFileReadyForMapping,
  maxFiles = 10,
  maxFileSize = 1024 * 1024 * 1024, // 1GB
  triggerFileUpdate,
}) => {
  const theme = useTheme();
  const { showNotification } = useNotification();
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isUploadingActive, setIsUploadingActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetTags, setDatasetTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');

  const showDatasetFields = files.length > 0;

  // Effect to handle externally triggered file updates (e.g., after mapping)
  useEffect(() => {
    if (triggerFileUpdate && triggerFileUpdate.fileIdToUpdate) {
      const fileExists = files.some(f => f.fileId === triggerFileUpdate.fileIdToUpdate);
      if (!fileExists) {
          // If the file ID from navigation state isn't in our current list, it might be an old update.
          // This can happen if the user navigates back and forth.
          // Or, if files state is managed by parent, this check might be different.
          console.warn(`File ID ${triggerFileUpdate.fileIdToUpdate} from trigger not found in current uploader list.`);
          return;
      }

      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.fileId === triggerFileUpdate.fileIdToUpdate // Important: Match on API fileId
            ? { ...f, status: triggerFileUpdate.newStatus, jobId: triggerFileUpdate.newIngestionJobId, progress: 0, processingProgress: 0, message: 'Processing data...' }
            : f
        )
      );
      // Start polling for the new ingestion job
      pollJobStatusLoop(
        files.find(f=>f.fileId === triggerFileUpdate.fileIdToUpdate)!.id, // internal list id
        triggerFileUpdate.newIngestionJobId,
        'data_ingestion'
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerFileUpdate]); // Only re-run if triggerFileUpdate changes


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter(file => {
        if (!file.name.endsWith('.csv')) {
          showNotification(`${file.name} is not a CSV file. Only .csv files are allowed.`, 'warning');
          return false;
        }
        if (file.size > maxFileSize) {
          showNotification(`${file.name} exceeds the maximum file size of ${formatFileSize(maxFileSize)}.`, 'warning');
          return false;
        }
        return true;
      });

      if (files.length + validFiles.length > maxFiles) {
        showNotification(`Cannot add ${validFiles.length} file(s). Maximum ${maxFiles} files allowed in a single batch.`, 'warning');
        return;
      }

      const newFiles: FileUploadItem[] = validFiles.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        status: 'pending_upload' as FileUploadStatus, // Initial status after selection
        progress: 0,
        uploadProgress: 0,
        processingProgress: 0,
      }));

      setFiles(prev => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, maxFileSize, showNotification]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    disabled: isUploadingActive && !isPaused, // Allow adding files if paused or not uploading
    multiple: true, // Always allow multiple, can be restricted by maxFiles
  });

  const removeFile = (fileItemId: string) => {
    setFiles(prev => prev.filter(f => {
      if (f.id === fileItemId) {
        if (f.status === 'uploading' || f.status === 'processing_suggestions' || f.status === 'processing_data') {
          showNotification(`Cannot remove ${f.file.name} while it's actively processing. Try cancelling first.`, 'warning');
          return true; // Keep it for now
        }
        return false;
      }
      return true;
    }));
  };

  const clearCompletedOrFailed = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed' && f.status !== 'failed' && f.status !== 'cancelled'));
  };

  const handleStartUploads = async () => {
    setIsUploadingActive(true);
    setIsPaused(false);

    const filesToUpload = files.filter(f => f.status === 'pending_upload');
    if (filesToUpload.length === 0) {
        setIsUploadingActive(false);
        return;
    }

    // Process files in batches of, for example, 3 for better performance and control
    const concurrentUploadLimit = 3;
    for (let i = 0; i < filesToUpload.length; i += concurrentUploadLimit) {
      if (isPaused) {
        // If paused, stop processing further batches but let current ones finish
        // setIsUploadingActive(false); // Or keep true if some are still active
        break;
      }
      const batchToProcess = filesToUpload.slice(i, i + concurrentUploadLimit);
      await Promise.all(batchToProcess.map(fileItem => uploadAndProcessSingleFile(fileItem)));
    }

    // Check if all files are done after the loop finishes or is broken by pause
    const anyStillActive = files.some(f => ['uploading', 'processing_suggestions', 'processing_data'].includes(f.status));
    if (!anyStillActive) {
        setIsUploadingActive(false);
    }

    // Check if all files have reached a final state (completed or failed)
    const allFilesAttempted = files.every(f => f.status === 'completed' || f.status === 'failed' || f.status === 'cancelled');
    if (allFilesAttempted && files.length > 0 && onUploadComplete) {
      const datasetMeta = (datasetName.trim() !== '')
        ? { name: datasetName.trim(), description: datasetDescription.trim(), tags: datasetTags }
        : undefined;
      onUploadComplete(files, datasetMeta);
    }
  };

  const uploadAndProcessSingleFile = async (fileItem: FileUploadItem) => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? { ...f, status: 'uploading' as FileUploadStatus, startTime: new Date(), progress: 5, uploadProgress: 0, message: 'Starting upload...' }
          : f
      ));

      // Actual file upload with progress
      const response = await uploadFile(fileItem.file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id
            ? { ...f, uploadProgress: percentCompleted, progress: 5 + Math.round(percentCompleted * 0.4) } // Upload is ~40% of this stage
            : f
        ));
      });

      // Update with job ID and switch to processing_suggestions
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? {
              ...f,
              status: 'processing_suggestions' as FileUploadStatus,
              uploadProgress: 100,
              progress: 50, // Base for suggestion processing
              jobId: response.jobId,
              fileId: response.fileId,
              message: 'Uploaded. Processing for suggestions...',
            }
          : f
      ));

      // Poll for job status (for suggestions)
      await pollJobStatusLoop(fileItem.id, response.jobId, 'suggestions');

    } catch (error: any) {
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id
          ? {
              ...f,
              status: 'failed' as FileUploadStatus,
              error: error.message || 'Upload failed',
              endTime: new Date(),
              progress: 100, // Mark as "done" for progress calculation
              message: `Upload failed: ${error.message}`,
            }
          : f
      ));
    }
  };

  const pollJobStatusLoop = async (fileItemId: string, jobId: string, stage: 'suggestions' | 'data_ingestion') => {
    try {
      const jobDetails = await getJobStatus(jobId);

      if (jobDetails.status === 'completed') {
        if (stage === 'suggestions') {
          setFiles(prev => {
            const updatedFiles = prev.map(f =>
              f.id === fileItemId
                ? {
                    ...f,
                    status: 'ready_for_mapping' as FileUploadStatus,
                    progress: 100, // Suggestions part is 100% done
                    processingProgress: 100,
                    message: 'Ready for mapping.',
                    // mappingSuggestions: jobDetails.data?.mappingSuggestions // Store suggestions if needed
                  }
                : f
            );
            
            // Find the updated file item within the setState callback to ensure we have the latest state
            const currentFileItem = updatedFiles.find(f => f.id === fileItemId);
            if (currentFileItem && onFileReadyForMapping) {
              // Use setTimeout to ensure state update completes before callback
              setTimeout(() => {
                onFileReadyForMapping({
                    ...currentFileItem,
                    status: 'ready_for_mapping',
                    // mappingSuggestions: jobDetails.data?.mappingSuggestions
                });
              }, 0);
            }
            
            return updatedFiles;
          });
        } else { // data_ingestion
          setFiles(prev => prev.map(f =>
            f.id === fileItemId
              ? {
                  ...f,
                  status: 'completed' as FileUploadStatus,
                  progress: 100, // Data ingestion is 100% done
                  processingProgress: 100,
                  endTime: new Date(),
                  message: 'File processing completed successfully.',
                }
              : f
          ));
        }
      } else if (jobDetails.status === 'failed') {
        setFiles(prev => prev.map(f =>
          f.id === fileItemId
            ? {
                ...f,
                status: 'failed' as FileUploadStatus,
                error: jobDetails.error || (stage === 'suggestions' ? 'Suggestion processing failed' : 'Data ingestion failed'),
                endTime: new Date(),
                progress: 100, // Mark as "done" for progress calculation
                message: `Error: ${jobDetails.error || 'Processing failed'}`,
              }
            : f
        ));
      } else { // Still processing (queued, active)
        setFiles(prev => prev.map(f =>
          f.id === fileItemId
            ? {
                ...f,
                processingProgress: jobDetails.progress || f.processingProgress,
                // For suggestions stage, overall progress is 50% + half of API progress
                // For data ingestion stage, overall progress is also ~50% of this stage
                progress: stage === 'suggestions'
                            ? 50 + Math.round((jobDetails.progress || 0) * 0.5)
                            : 50 + Math.round((jobDetails.progress || 0) * 0.5),
                message: jobDetails.message || (stage === 'suggestions' ? 'Generating suggestions...' : 'Ingesting data...'),
              }
            : f
        ));
        // Continue polling
        setTimeout(() => pollJobStatusLoop(fileItemId, jobId, stage), 2000);
      }
    } catch (error: any) {
      setFiles(prev => prev.map(f =>
        f.id === fileItemId
          ? {
              ...f,
              status: 'failed' as FileUploadStatus,
              error: error.message || 'Failed to check processing status',
              endTime: new Date(),
              progress: 100, // Mark as "done"
              message: `Error polling status: ${error.message}`,
            }
          : f
      ));
    }
  };

  const getStatusIcon = (status: FileUploadStatus) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'uploading':
      case 'processing_suggestions':
      case 'processing_data':
        return <CircularProgress size={20} />;
      case 'ready_for_mapping': // Or a specific mapping icon
      case 'mapping_confirmed':
        return <FileIcon color="primary" />;
      default: // pending_selection, pending_upload, cancelled
        return <FileIcon />;
    }
  };

  const getStatusColor = (status: FileUploadStatus): "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'uploading':
      case 'processing_suggestions':
      case 'processing_data':
        return 'info';
      case 'ready_for_mapping':
      case 'mapping_confirmed':
        return 'primary';
      default:
        return 'inherit';
    }
  };

  const getStatusColorForChip = (status: FileUploadStatus): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'uploading':
      case 'processing_suggestions':
      case 'processing_data':
        return 'info';
      case 'ready_for_mapping':
      case 'mapping_confirmed':
        return 'primary';
      default:
        return 'default'; // Changed from 'inherit' to 'default' for Chip compatibility
    }
  };

  const getStatusLabel = (status: FileUploadStatus): string => {
    switch (status) {
      case 'pending_upload':
        return 'Queued';
      case 'uploading':
        return 'Uploading';
      case 'processing_suggestions':
        return 'Mapping scan';
      case 'ready_for_mapping':
        return 'Map columns';
      case 'mapping_confirmed':
        return 'Mapped';
      case 'processing_data':
        return 'Ingesting';
      case 'completed':
        return 'Complete';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  const totalFiles = files.length;
  const filesPendingUpload = files.filter(f => f.status === 'pending_upload').length;
  const filesCompleted = files.filter(f => f.status === 'completed').length;
  const filesFailed = files.filter(f => f.status === 'failed').length;
  const filesActive = files.filter(f => ['uploading', 'processing_suggestions', 'processing_data'].includes(f.status)).length;

  const overallBatchProgress = totalFiles > 0
    ? files.reduce((acc, f) => acc + f.progress, 0) / totalFiles
    : 0;

  return (
    <Box>
      {/* Dataset Metadata Inputs */}
      {showDatasetFields && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Typography variant="h6">
              Dataset details
            </Typography>
            <PipelineStatusChip size="small" />
          </Box>
          <Stack spacing={2}>
            <TextField
              label="Dataset Name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              fullWidth
              disabled={isUploadingActive}
              helperText="Optional"
            />
            <TextField
              label="Dataset Description"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={isUploadingActive}
              placeholder="A brief description of this dataset."
            />
            <Box>
              <TextField
                label="Add Tag"
                value={currentTagInput}
                onChange={(e) => setCurrentTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentTagInput.trim()) {
                    e.preventDefault();
                    if (!datasetTags.includes(currentTagInput.trim())) {
                      setDatasetTags([...datasetTags, currentTagInput.trim()]);
                    }
                    setCurrentTagInput('');
                  }
                }}
                disabled={isUploadingActive}
                size="small"
                sx={{ mr: 1, width: 'auto' }}
                placeholder="e.g., Q1-leads, verified"
              />
              <Button
                onClick={() => {
                  if (currentTagInput.trim() && !datasetTags.includes(currentTagInput.trim())) {
                    setDatasetTags([...datasetTags, currentTagInput.trim()]);
                  }
                  setCurrentTagInput('');
                }}
                disabled={isUploadingActive || !currentTagInput.trim()}
                size="small"
              >
                Add Tag
              </Button>
            </Box>
            {datasetTags.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {datasetTags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => {
                      setDatasetTags(datasetTags.filter((t) => t !== tag));
                    }}
                    disabled={isUploadingActive}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      {/* Drop Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          backgroundColor: isDragActive
            ? alpha(theme.palette.primary.main, 0.04)
            : 'background.paper',
          cursor: (isUploadingActive && !isPaused) ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop CSV files here' : 'Drag & drop CSV files here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select CSV files, up to {formatFileSize(maxFileSize)} each.
        </Typography>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Fade in>
          <Paper sx={{ mt: 3 }}>
            {/* Summary Bar */}
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  Upload queue
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <Chip size="small" label={`${totalFiles} total`} variant="outlined" />
                  {filesPendingUpload > 0 && <Chip size="small" label={`${filesPendingUpload} queued`} />}
                  {filesActive > 0 && <Chip size="small" label={`${filesActive} active`} color="info" />}
                  {filesCompleted > 0 && <Chip size="small" label={`${filesCompleted} complete`} color="success" variant="outlined" />}
                  {filesFailed > 0 && <Chip size="small" label={`${filesFailed} failed`} color="error" variant="outlined" />}
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={() => setShowDetails(!showDetails)} title={showDetails ? "Hide Details" : "Show Details"}>
                  {showDetails ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
                {!isUploadingActive && filesPendingUpload > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<StartIcon />}
                    onClick={handleStartUploads}
                    size="small"
                  >
                    Upload All Pending
                  </Button>
                )}
                {isUploadingActive && (
                  <Button
                    variant="outlined"
                    startIcon={isPaused ? <StartIcon /> : <PauseIcon />}
                    onClick={() => setIsPaused(!isPaused)}
                    size="small"
                  >
                    {isPaused ? 'Resume Queuing' : 'Pause Queuing'}
                  </Button>
                )}
                {(filesCompleted > 0 || filesFailed > 0) && (
                  <Button
                    variant="text"
                    onClick={clearCompletedOrFailed}
                    size="small"
                  >
                    Clear Finished
                  </Button>
                )}
              </Box>
            </Box>

            {/* Overall Progress */}
            {isUploadingActive && filesActive > 0 && (
              <LinearProgress
                variant="determinate"
                value={overallBatchProgress}
                sx={{ height: 6 }}
              />
            )}

            {/* File Details */}
            <Collapse in={showDetails}>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {files.map((fileItem, index) => (
                  <Zoom
                    key={fileItem.id}
                    in
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <ListItem
                      sx={{
                        borderBottom: index < files.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <ListItemIcon>{getStatusIcon(fileItem.status)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{wordBreak: 'break-all'}}>{fileItem.file.name}</Typography>
                            <Chip
                              size="small"
                              label={getStatusLabel(fileItem.status)}
                              color={getStatusColorForChip(fileItem.status)}
                              variant={fileItem.status === 'pending_upload' ? 'outlined' : 'filled'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" component="div">
                              {formatFileSize(fileItem.file.size)}
                              {fileItem.message && ` - ${fileItem.message}`}
                              {fileItem.error && (
                                <Typography component="span" color="error" variant="caption">
                                  {' '} - Error: {fileItem.error}
                                </Typography>
                              )}
                            </Typography>
                            {(fileItem.status === 'uploading' || fileItem.status === 'processing_suggestions' || fileItem.status === 'processing_data') && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={fileItem.status === 'uploading' ? fileItem.uploadProgress : fileItem.processingProgress}
                                  sx={{ flexGrow: 1, height: 4 }}
                                  color={getStatusColor(fileItem.status)}
                                />
                                <Typography variant="caption">
                                  {Math.round(fileItem.status === 'uploading' ? fileItem.uploadProgress : fileItem.processingProgress)}%
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        {fileItem.status === 'ready_for_mapping' && (
                           <Button
                             size="small"
                             onClick={() => onFileReadyForMapping && onFileReadyForMapping(fileItem)}
                           >
                             Map Columns
                           </Button>
                        )}
                        {(fileItem.status === 'pending_upload' || fileItem.status === 'failed' || fileItem.status === 'cancelled' || fileItem.status === 'completed') && (
                          <IconButton edge="end" onClick={() => removeFile(fileItem.id)} title="Remove file">
                            <DeleteIcon />
                          </IconButton>
                        )}
                         {/* Add cancel button for active states later */}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Zoom>
                ))}
              </List>
            </Collapse>
          </Paper>
        </Fade>
      )}

      {/* Clear All Confirmation - kept from original BatchUpload */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Clear All Files?</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            This will remove all files from the upload queue. Active uploads/processing may not be cancellable.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setFiles([]); // Consider more graceful cancellation for active files
              setConfirmDialogOpen(false);
              setIsUploadingActive(false);
              setIsPaused(false);
            }}
            color="error"
            variant="contained"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UnifiedUploader;
